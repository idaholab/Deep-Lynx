#!/bin/bash

error_occurred=false

printf "Refreshing helm release...\n\n"

# uninstall current release
helm uninstall dl1

printf "\n"

# delete persistnce volume claims
kubectl delete pvc --all
if [ $? -ne 0 ]; then error_occurred=true; fi

printf "\n"

# delete any old deeplynx helm packages
find . -name '*.tgz' -delete -maxdepth 1
if [ $? -ne 0 ]; then error_occurred=true; fi

# create a new helm package
helm package .
if [ $? -ne 0 ]; then error_occurred=true; fi

printf "\n"

# install the new package
helm install dl1 deeplynx-0.1.0.tgz
if [ $? -ne 0 ]; then error_occurred=true; fi

if $error_occurred; then
  printf "\nRefreshed with potential issues.\n\n"
else
  printf "\nSuccessful refresh!\n\n"
fi

kubectl get pods -A -o wide

