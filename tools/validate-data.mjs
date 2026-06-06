#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_PATH = path.join(ROOT, 'data', 'family.json');
const SCHEMA_PATH = path.join(ROOT, 'data', 'family.schema.json');

const issues = [];
let schemaChecked = false;

function addIssue({ id = 'data', field, expected, actual = '' }) {
  issues.push({ ID: id, field, expected, actual: String(actual ?? '') });
}

async function readJson(filePath) {
  try {
    return JSON.parse(await readFile(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`${path.relative(ROOT, filePath)} could not be read as JSON: ${error.message}`);
  }
}

async function loadAjv() {
  try {
    return [await import('ajv'), await import('ajv-formats')];
  } catch {
    console.warn('ℹ️ ajv not found; installing temporary validation dependencies with npm install --no-save --no-package-lock ajv ajv-formats');
    const result = process.platform === 'win32'
      ? spawnSync('npm install --no-save --no-package-lock ajv ajv-formats', {
          cwd: ROOT,
          shell: true,
          stdio: 'inherit'
        })
      : spawnSync('npm', ['install', '--no-save', '--no-package-lock', 'ajv', 'ajv-formats'], {
          cwd: ROOT,
          stdio: 'inherit'
        });
    if (result.status !== 0) {
      throw new Error('Unable to install ajv/ajv-formats for schema validation.');
    }
    return [await import('ajv'), await import('ajv-formats')];
  }
}

function decodePointerPart(part) {
  return part.replace(/~1/g, '/').replace(/~0/g, '~');
}

function idFromInstancePath(data, instancePath = '') {
  const parts = instancePath.split('/').filter(Boolean).map(decodePointerPart);
  const [collection, index] = parts;
  const row = data?.[collection]?.[Number(index)];

  if (collection === 'people' && row?.id) return row.id;
  if (collection === 'couples') return row?.id ?? `${row?.partner1 ?? '?'} + ${row?.partner2 ?? '?'}`;
  if (collection === 'parentChild') return row?.id ?? `${row?.parentId ?? row?.parent ?? '?'} -> ${row?.childId ?? row?.child ?? '?'}`;
  if (collection === 'events') return row?.id ?? row?.title ?? `events[${index}]`;
  return 'data';
}

function fieldFromAjvError(error) {
  const parts = error.instancePath.split('/').filter(Boolean).map(decodePointerPart);
  if (error.keyword === 'required' && error.params?.missingProperty) {
    parts.push(error.params.missingProperty);
  }
  return parts.length ? parts.join('.') : '(root)';
}

function expectedFromAjvError(error) {
  const allowed = error.params?.allowedValues;
  const allowedText = Array.isArray(allowed) ? `: ${allowed.join(', ')}` : '';
  return `${error.message ?? error.keyword}${allowedText}`;
}

async function validateSchema(data) {
  if (!existsSync(SCHEMA_PATH)) {
    console.warn('⚠️ data/family.schema.json not found; schema validation skipped.');
    return;
  }

  schemaChecked = true;
  const schema = await readJson(SCHEMA_PATH);
  const [{ default: Ajv }, { default: addFormats }] = await loadAjv();
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);

  if (!validate(data)) {
    for (const error of validate.errors ?? []) {
      addIssue({
        id: idFromInstancePath(data, error.instancePath),
        field: fieldFromAjvError(error),
        expected: expectedFromAjvError(error)
      });
    }
  }
}

function yearRange(value) {
  if (!value) return null;
  const raw = typeof value === 'object'
    ? [value.date, value.year, value.text].filter(Boolean).join(' ')
    : String(value);
  const years = [...raw.matchAll(/\b(1[5-9]\d{2}|20\d{2})\b/g)].map(match => Number(match[1]));
  if (!years.length) return null;
  return { start: Math.min(...years), end: Math.max(...years), raw };
}

function validateRelationships(data) {
  const people = Array.isArray(data.people) ? data.people : [];
  const peopleById = new Map(people.map(person => [person.id, person]));

  (data.parentChild ?? []).forEach((relationship, index) => {
    const parentId = relationship.parentId ?? relationship.parent;
    const childId = relationship.childId ?? relationship.child;
    const id = relationship.id ?? `${parentId ?? '?'} -> ${childId ?? '?'}`;

    if (!peopleById.has(parentId)) {
      addIssue({ id, field: `parentChild[${index}].parentId`, expected: 'existing people.id', actual: parentId });
    }
    if (!peopleById.has(childId)) {
      addIssue({ id, field: `parentChild[${index}].childId`, expected: 'existing people.id', actual: childId });
    }

    const parent = peopleById.get(parentId);
    const child = peopleById.get(childId);
    const parentDeath = yearRange(parent?.died);
    const childBirth = yearRange(child?.born);
    if (parent && child && parentDeath && childBirth && parentDeath.end < childBirth.start) {
      addIssue({
        id,
        field: 'chronology',
        expected: "parent's death year must not be before child's birth year",
        actual: `${parent.name} died ${parentDeath.raw}; ${child.name} born ${childBirth.raw}`
      });
    }
  });

  (data.couples ?? []).forEach((couple, index) => {
    const personIds = Array.isArray(couple.personIds)
      ? couple.personIds
      : [couple.partner1, couple.partner2].filter(Boolean);
    const id = couple.id ?? `couples[${index}]`;

    if (!personIds.length) {
      addIssue({ id, field: `couples[${index}].personIds`, expected: 'at least two people IDs or partner1/partner2 fields' });
      return;
    }

    personIds.forEach((personId, personIndex) => {
      if (!peopleById.has(personId)) {
        addIssue({
          id,
          field: Array.isArray(couple.personIds) ? `couples[${index}].personIds[${personIndex}]` : `couples[${index}].partner${personIndex + 1}`,
          expected: 'existing people.id',
          actual: personId
        });
      }
    });
  });
}

try {
  const data = await readJson(DATA_PATH);
  await validateSchema(data);
  validateRelationships(data);

  issues.sort((a, b) => `${a.ID} ${a.field}`.localeCompare(`${b.ID} ${b.field}`));

  if (issues.length) {
    console.error(`❌ data/family.json has ${issues.length} validation issue(s):`);
    console.table(issues);
    process.exit(1);
  }

  const counts = {
    people: data.people?.length ?? 0,
    couples: data.couples?.length ?? 0,
    parentChild: data.parentChild?.length ?? 0,
    events: data.events?.length ?? 0
  };
  const schemaText = schemaChecked ? 'schema + custom checks' : 'custom checks; schema skipped';
  console.log(`✅ data/family.json passed ${schemaText} (${counts.people} people, ${counts.couples} couples, ${counts.parentChild} parent-child links, ${counts.events} events).`);
} catch (error) {
  console.error(`❌ ${error.message}`);
  process.exit(1);
}
