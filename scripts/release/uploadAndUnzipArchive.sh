#!/bin/bash

if [ "$#" -lt 2 ]
  then
    echo "You must supply a release version and archive file"
    echo "For example: ./scripts/release/uploadAndUnzipArchive.sh.sh 19.1.2 archive_20181120_19.1.3.zip"
    exit 1
fi

function checkFileExists {
    file=$1
    if ! [[ -f "$file" ]]
    then
        echo "File [$file] doesn't exist - exiting script.";
        exit;
    fi
}

VERSION=$1
ARCHIVE=$2

# a little safety check
if ! [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]
then
    echo "Version isn't in the expected format. Valid format is: Number.Number.number. For example 19.1.2";
    exit;
fi

checkFileExists $ARCHIVE
#checkFileExists ~/aggrid/aggrid.txt
checkFileExists ~/.ssh/ag_ssh
checkFileExists ~/Documents/aggrid/aggrid/.creds

# $3 is optional skipWarning argument
if [ "$3" != "skipWarning" ]; then
    while true; do
        echo    "*********************************** WARNING ************************************************"
        read -p "This script will DELETE the existing archive of $VERSION (if it exists) and will REPLACE it. Do you wish to continue [y/n]? " yn
        case $yn in
            [Yy]* ) break;;
            [Nn]* ) exit;;
            * ) echo "Please answer [y]es or [n]o.";;
        esac
    done
fi

#USERNAME=`awk '{print $1}' ~/aggrid/aggrid.txt`
#PASSWORD=`awk '{print $2}' ~/aggrid/aggrid.txt`

# delete dir if it exists - can ignore dir not found error
ssh -i ~/.ssh/ag_ssh ceolter@ag-grid.com "cd public_html/archive/ && rm -r $VERSION"

# upload file
curl --netrc-file ~/Documents/aggrid/aggrid/.creds --ftp-create-dirs -T $ARCHIVE ftp://ag-grid.com/$VERSION/

#unzip archive
ssh -i ~/.ssh/ag_ssh ceolter@ag-grid.com "cd public_html/archive/$VERSION && unzip $ARCHIVE"

#update folder permissions (default is 777 - change to 755)
ssh -i ~/.ssh/ag_ssh ceolter@ag-grid.com "chmod -R 755 public_html/archive/$VERSION"
