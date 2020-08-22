#!/usr/bin/env bash

if [ "$#" -lt 1 ]
  then
    echo "You must supply a release version number"
    echo "For example: ./scripts/release/createDocsReleaseBundle.sh 19.1.2"
    exit 1
fi

ZIP_PREFIX=`date +%Y%m%d`

RAW_VERSION=$1
VERSION=""${RAW_VERSION//./}""

echo "Building Docs Release"
cd grid-packages/ag-grid-docs
rm -rf dist
npx gulp release
cd dist

FILENAME=release_"$ZIP_PREFIX"_v"$VERSION".zip
zip -r ../../../$FILENAME *

cd ../../../

