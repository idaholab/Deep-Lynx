#!/bin/bash

printf "Refreshing helm release...\n\n"

# uninstall current release
helm uninstall dl1 --namespace deeplynx

printf "\n"

# delete persistnce volume claims
kubectl delete pvc --all --namespace deeplynx

printf "\n"

# delete any old deeplynx helm packages
find . -name '*.tgz' -delete -maxdepth 1

# create a new helm package
helm package .

printf "\n"

# install the new package
helm install dl1 deeplynx-0.1.0.tgz --namespace deeplynx --create-namespace

printf "\nSuccessful refresh!\n\n"

kubectl get pods -A -o wide

