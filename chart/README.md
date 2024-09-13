# DeepLynx Kubernetes Helm Charts

## Introduction
This chart uses [Helm](https://helm.sh/) to bootstrap a [DeepLynx](https://github.com/idaholab/Deep-Lynx) 
deployment to a [Kubernetes](http://kubernetes.io) cluster along with its dependencies and specified 
companion apps (Airflow, DataHub, etc.)

## Setup
1. Set up a kubernetes cluster
    - In a cloud platform like [Amazon EKS](https://aws.amazon.com/eks),
      [Google Kubernetes Engine](https://cloud.google.com/kubernetes-engine),
      and [Azure Kubernetes Service](https://azure.microsoft.com/en-us/services/kubernetes-service/) **OR**
    - In local environment using a local kubernetes like [K3d](https://k3d.io/) 
      or [Minikube](https://minikube.sigs.k8s.io/docs/).
    - *Note:* certain companion apps may have hardware requirements
      (for example, DataHub requires more than 7GB of RAM)
2. Install the following tools:
    - [kubectl](https://kubernetes.io/docs/tasks/tools/) to manage kubernetes resources
    - [helm](https://helm.sh/docs/intro/install/) to deploy the resources based on helm charts

## Configuration
Additional apps that may be deployed to kubernetes by Helm are listed under `dependencies` 
in `Chart.yaml`. Each listed dependency may be conditionally stood up as part of a Helm install 
by setting the appropriate items in `values.yaml`. These items include the `enabled` key
(a boolean included for each dependency) and optional tags that indicate a type of deployment
(e.g. `core` for regularly used dependencies, `digitalTwin` for dependencies needed to 
support digital twin deployments, etc.)

In general, conditions (the `enabled` key) take precedence over tags. See the 
[documentation](https://helm.sh/docs/topics/charts/#tags-and-condition-fields-in-dependencies)
for more details.

Besides determining which dependencies will be created, `values.yaml` also contains all other settings 
that a user may need to configure for a successful deployment. DeepLynx environment variables can be 
found under `deeplynx.env`. PostgreSQL auth, storage volume size, and other relevant settings can be 
found under `postgresql`. The same is true for Redis (`redis`). Please refer to the provided comments as well as the 
[documentation](https://artifacthub.io/) provided by each dependency's helm chart for further details. 
Additional settings regarding the management and policies of the DeepLynx pod that will be deployed to 
kubernetes may also be set here.  

Note that for the PostgreSQL and Redis connection strings, these values are stored as secrets in the 
`secret.yaml` template file. The credentials supplied in these connections strings must match the 
credentials stored under the `postgresql.auth` and `redis.auth` settings in `values.yaml`.

## Quickstart

Add the INL Helm repo by running the following:

```(shell)
helm repo add TBD https://helm.TBD.io/
```

Configure the dependencies to enable and other settings by either updating a copy of the 
[values.yaml](https://github.com/idaholab/Deep-Lynx) file 
and supplying it to the `helm install` command with the `-f` option **OR** providing them directly with the 
`--set` flag. See the [documentation](https://helm.sh/docs/chart_template_guide/values_files/) for more details.  

For an installation with a custom `values.yaml`:

```(shell)
helm install dl1 -f myvals.yaml --namespace deeplynx TBD/deeplynx
```

Note that the above command is in the form of: **helm install \[_release name_\] -f 
\[_path and name of custom values.yaml file_\] --namespace \[_namespace name_\] \[_repository name_\]/deeplynx**

A successful install will show some values defining the deployment and release of the DeepLynx pod to 
kubernetes as well as some commands that can be run to perform port forwarding to allow for access to 
DeepLynx outside the kubernetes cluster (a simpler port forwarding method is provided below).

Run `kubectl get pods` to check whether all the pods for the dependencies are running.
You should see a DeepLynx pod in addition to one or more pods for the dependencies specified to be installed.

You can run the following to expose the frontend locally. Note, you can find the pod name using the command above.  

```(shell)
kubectl port-forward <DeepLynx pod name> 8090:8090
```

You should be able to access DeepLynx via http://localhost:8090.

### Running for a Local Environment

Please see the steps in **Kubernetes Tips** of the [Contributing Guidelines](CONTRIBUTING.md) for instructions on how 
to release this Helm chart in a local environment using ingress-nginx as a load balancer and reverse proxy.

### Kubernetes Dashboard

The [kubernetes dashboard](https://kubernetes.io/docs/tasks/access-application-cluster/web-ui-dashboard/) 
can be enabled and included with this Helm chart release. It provides insights into status, metrics, and 
configuration of kubernetes clusters. After ensuring that the chart is enabled and included in the release, 
please follow these steps to access it:
1. Run `kubectl port-forward svc/[releaseName]-kong-proxy 8443:443` where \[releaseName\] is the name of 
the release (`dl1` by default in `helm-refresh.sh`). Note that you can find the name of the kong-proxy 
service under services (`kubectl get svc`)
2. Note that a user for accessing the dashboard is created as part of the Helm chart release via the 
dashboard-user.yaml and dashboard-clusterrolebinding.yaml template files
3. Run `kubectl create token dashboard-user` to generate a token (add namespace with the `-n` option 
if not in the default namespace) 
4. Navigate to `localhost:8443` and supply the generated token to login 

## Contributing

Please refer to our [Contributing Guidelines](CONTRIBUTING.md).
