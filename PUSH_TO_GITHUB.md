# Push to GitHub - Run these commands in PowerShell

# 1. Authenticate with your personal GitHub account
gh auth login
# Choose: GitHub.com → HTTPS → Login with browser
# Make sure you're logging in as mgarrigan-hue, NOT your work account

# 2. Create the repo on your personal account
gh repo create greene-heritage --public --source=. --remote=origin --push

# 3. Enable GitHub Pages
gh api repos/mgarrigan-hue/greene-heritage/pages -X POST -f "build_type=legacy" -f "source[branch]=master" -f "source[path]=/"

# Your site will be live at: https://mgarrigan-hue.github.io/greene-heritage/
