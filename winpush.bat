echo --- git status
git status

echo --- git add .
git add .

echo --- git commit -m %date:~2,2%-%date:~5,2%-%date:~8,2%
git commit -m %date:~2,2%-%date:~5,2%-%date:~8,2%

echo --- git push origin gh-pages
git push origin gh-pages
