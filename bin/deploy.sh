#!/bin/sh

ghpages_dir="tmp/gh-pages"
remote="git@github.com:shuuuuun/tetricus.git"
url=$(echo $remote | perl -0ne 'print "https://$1.github.io/$2/" if (/[https?:\/\/|git\@]github\.com[\/|:]([^\/]+)\/([^\/]+)\.git/)')

has_dir=$([[ -e $ghpages_dir ]]; echo $?)

mkdir -pv $ghpages_dir
cd $ghpages_dir

if [[ $has_dir == 1 ]]; then
  git clone -b gh-pages --depth 1 $remote .
  git fetch --depth 1 origin master:refs/remotes/origin/master
fi

git pull origin gh-pages
git fetch origin master:refs/remotes/origin/master
git checkout origin/master public
cp -rf public/* ./
rm -rf public
git add --all
git commit -m 'update'
git push origin gh-pages

echo $url

