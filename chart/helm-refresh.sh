#!/bin/bash

dependencies='false'
help='false'
pvc='false'
timeout="5m0s"

while getopts dpht: flag
do
    case "${flag}" in
        d) dependencies='true';;
        p) pvc='true';;
        t) timeout=${OPTARG};;
        h) help='true';;
    esac
done

if $help; then
  printf "This script uninstalls a helm release (named \"dl1\" by default), "
  printf "deletes all persistent volume claims if passed the p option, "
  printf "deletes any old deeplynx helm pacakges, "
  printf "updates helm dependencies if passed the d option, creates a new "
  printf "helm package, and then installs the package."
  printf "\n\n"
  printf "Options:"
  printf "\n"
  printf "    -h Show this help\n"
  printf "    -d Update helm dependencies\n"
  printf "    -t Provide install timeout in the form XmYs where X is the number of minutes\n"
  printf "           and Y is the number of seconds. Default 5m0s.\n"
  printf "    -p Delete persistent volume claims\n"

  exit 0
fi

error_occurred=false

printf "Refreshing helm release...\n\n"

# uninstall current release
helm uninstall dl1

printf "\n"

# optionally delete persistent volume claims
if $pvc; then
  kubectl delete pvc --all
  if [ $? -ne 0 ]; then error_occurred=true; fi

  printf "\n"
fi

# delete any old deeplynx helm packages
find . -name '*.tgz' -delete -maxdepth 1
if [ $? -ne 0 ]; then error_occurred=true; fi

# optionally update helm dependencies
if $dependencies; then
  printf "Updating helm dependencies...\n\n"

  helm dependency update
  if [ $? -ne 0 ]; then error_occurred=true; fi
fi

# create a new helm package
helm package .
if [ $? -ne 0 ]; then error_occurred=true; fi

printf "\n"
printf "Starting install with timeout $timeout\n\n"

# install the new package
helm install dl1 deeplynx-0.1.0.tgz --timeout ${timeout}
if [ $? -ne 0 ]; then error_occurred=true; fi

if $error_occurred; then
  printf "\nRefreshed with potential issues.\n\n"
else
  printf "\nSuccessful refresh!\n\n"
fi

kubectl get pods -A -o wide

