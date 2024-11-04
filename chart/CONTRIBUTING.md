## Contributing

The DeepLynx Helm package relies on several key resources:
- `Chart.yaml`: The Helm chart which importantly specifies the name, helm chart version, app version (must
  match a docker image release version), and dependencies.
- `values.yaml`: The customizable config supplied to the Helm install that determines which dependencies
  are deployed, critical DeepLynx environment variables, and can also overwrite values in subcharts (the
  charts of dependencies) and determine other settings related to the deployment.
- `deployment.yaml`: A yaml template file that passes in various values from both the Chart and values files.
  Of note is the environment variables that are passed to the DeepLynx image.
  - Note that boolean environment variables passed to a templated yaml file like this one should be "quoted" 
  via the [quote](https://helm.sh/docs/chart_template_guide/functions_and_pipelines/) function.

### Local Development

Commands for refreshing the Helm chart (described below and viewable within `helm-refresh.sh`) have been consolidated 
into a single executable bash script, `helm-refresh.sh`. Therefore, it is possible to iterate in local development by 
simply executing `./helm-refresh.sh` to apply new changes to a fresh set of pods and PVCs. The following describes the 
general set of commands used to install and uninstall a release.  

After making changes, it's best practice to lint the chart. This can be done by running `helm lint` within the
`chart` directory.

Once you are ready to test your changes, you can package the chart by running `helm package .` **within the
`chart` directory**.

This will create a `.tgz` file that contains the Helm chart and can be installed. Run the command `helm install
dl1 ./chart/deeplynx-0.1.0.tgz --namespace deeplynx --create-namespace` **from the root project directory** to install 
the chart (where in this example `dl1` is the name of the release, `deeplynx` is the name of the namespace to create, 
and `deeplynx-0.1.0.tgz` is the name of the package to install).

`helm uninstall` allows you to remove the pods (leaving PVC in place, see below commands). Iterate with a
new package and install.

### Other useful commands
- `kubectl get pods`: See status of pods
- `kubectl describe pod [podName]`: See details around a pod where `[podName]` is the name of the pod
- `kubectl logs [podName]`: See the logs for the specified pod
- `kubectl get svc`: See information on services within the cluster
- `kubectl get ingress`: See ingress rules for the cluster
- `kubectl exec [podName] -- [command]`: Execute a command on a pod where `[command]` is the command to
  execute (e.g. `ls`)
- `kubectl get pvc`: See persistent volume claims (PVC, persistent storage used by a pod upon a new install
  or upgrade if available)
- `kubectl delete pvc [pvcName]`: Delete a PVC where `[pvcName]` is the name of the PVC to delete. Useful
  when values that may be stored in an older PVC need to be overwritten

### Kubernetes Tips

If working locally with [K3d](https://k3d.io/), a custom certificate may need to be
[provided](https://k3d.io/v5.3.0/faq/faq/#pods-fail-to-start-x509-certificate-signed-by-unknown-authority).
You can forward the included certificate to your local custom cert with the command
`k3d cluster create local --agents 3 --volume /Users/Shared/myCert.crt:/etc/ssl/certs/myCert.crt -p "8081:80@loadbalancer"`
where `/Users/Shared/myCert.crt` is the local path to your cert.

As can be seen in the above command, a load balancer and ingress controller is desirable for local development. The load 
balancer port(s) must be defined at the cluster level. In the above command, we are mapping the localhost's port 8081 
to port 80 of the cluster's load balancer. 

**To use DeepLynx and the other cluster resources in a local environment with an ingress load balancer enabled**, follow these 
steps. Note that the ingress-nginx controller needs to be created before the DeepLynx Helm release is created in order 
to acquire external IPs. Additionally, for local development and use the `ingress-nginx.enabled` value in `values.yaml` 
should be set to `false` as attempts to stand up the ingress-nginx controller within the same release and namespace as 
the rest of the DeepLynx release have been unsuccessful thus far.  
1. Create the cluster (a certificate example is shown here) and expose ports 8090 (DeepLynx), 8080 (Airflow), 5432 (Postgres) to the load balancer: 
`k3d cluster create local --agents 3 --volume /Users/Shared/CAINLROOT_B64.crt:/etc/ssl/certs/CAINLROOT_B64.crt -p "8090:8090@loadbalancer" -p "8080:8080@loadbalancer" -p "5432:5432@loadbalancer"`
2. Stand up an ingress-nginx ingress controller in its own namespace: 
`helm upgrade --install ingress-nginx ingress-nginx --repo https://kubernetes.github.io/ingress-nginx --values nginx-values.yaml --namespace ingress-nginx --create-namespace`
3. Ensure a pod has been created for the controller: `kubectl get pods --namespace ingress-nginx`
4. Ensure the service for the controller has been created and that there are one or more IPs exposed via `EXTERNAL-IP`:
`kubectl get service ingress-nginx-controller --namespace=ingress-nginx` External IPs should be allocated within one minute
of the creation of the pod and service. If IPs are not being allocated, try deleting and recreating the cluster or using 
the `watch status` command provided in the nginx install output.  
NOTE: Seeing a `404` status at `localhost:8081` may indicate that the nginx load balancer is not being reached. `5XX` errors 
should be seen related to nginx if nginx is being reached but a service is unavailable or unreachable.  
5. Create a release of DeepLynx (can be done by using the `helm-refresh.sh` script via `./helm-refresh.sh`)
6. Once all pods are running, you can access DeepLynx at `localhost:8081`


### Exposing an Application and Port

Applications running within the cluster can be exposed a few different ways. Ingress rules can be set in `ingress.yaml` 
to expose services, however Ingress rules cannot receive traffic on any ports besides the defined HTTP and HTTPS ports
(80 and 443 by default, respectively). This is therefore very limiting for exposing multiple services via `localhost` and 
requires the use of hostnames to differentiate across applications effectively. (Note that differentiating by `path`) is 
generally unsuccessful due to the inability to handle the redirects that will occur for a given application). Hostnames 
may be used for production use cases where DNS records have been established to match the host names, or by editing the 
host file of the local host.  

To expose various applications on different ports all using the same `localhost` host, the `nginx-values.yaml` file may 
be updated along with ensuring the desired ports are mapped between the cluster and localhost. Please follow these steps: 
1. Ensure the desired ports are mapped between the cluster and localhost by supplying them in cluster creation (e.g. see 
the `-p` option in step 1 above. These are in the format `[localPort]:[clusterPort]@loadbalancer`. This process may depend 
on the kubernetes manager and environment (k3d, minikube))
2. Expose the port from the nginx controller by ensuring it is in the list of ports in `nginx-values.yaml` `controller.containerPort`. 
See the `deeplynx` property as an example.
3. Add a mapping from the exposed port to the service and port defined in `service.yaml`. This is done by following the 
convention shown in the `tcp` property at the root level of the `nginx-values.yaml` file. Note that this must point to a 
service defined in `service.yaml` and that the specified port must match the `port` property of the service and the 
namespace (default or whatever else was provided) must also match.


### Pushing to Artifact Hub

TBD
