## This is a walkthrough of the Docker [Get Started](https://docs.docker.com/get-started/) series.

## Part 2: Containers

#### Build the image;

```sh
> docker build -t docker_demo:build .
```

####  Run the *docker_demo:build* image in the *get_started* container;

```sh
> docker run --name get_started -p 8000:3001 docker_demo:build npm run dev
> curl -i http://localhost:8000
```

If you want the container to work in the background, you need to run the image in detached mode;

```sh
> docker run -d --name get_started -p 8000:3001 docker_demo:build npm run dev
```

If you want to run a new container with the same name, you need to remove the old one first;

```sh
> docker rm get_started
```

If you want to restart the old one;

```sh
> docker start get_started
```

To see the log output of a container in detached mode;

```sh
> docker logs -f get_started
```

#### Push the image

Since the deploy procedure in this walkthrough needs an image to pull, you will push the one you built to [Docker Hub](https://hub.docker.com/signup). You need to register, and  do [docker login](https://docs.docker.com/engine/reference/commandline/login/).

Also, you need to edit the `.env` file with your Docker user, and the tag you will use when pushing the image.

```sh
> cp env.sample .env
> export $(cat .env) # load .env variables into shell
> docker tag docker_demo:build ${DOCKER_USER}/docker_demo:${TAG}
> docker push ${DOCKER_USER}/docker_demo:${TAG}
```

When you need to build multi-architecture (amd64, arm32v6) images, you need different tags per arch; i.e. :amd64-latest, :arm32v6-latest. This way of tagging is not best-practice. For easier management of images across architectures, [use manifests](https://medium.com/@mauridb/docker-multi-architecture-images-365a44c26be6).

## Part 3: Services

> Services are really just “containers in production.” A service only runs one image, but it codifies the way that image runs—what ports it should use, how many replicas of the container should run so the service has the capacity it needs, and so on.

You will init a swarm on your *physical* machine, thus making it the swarm manager node, and then deploying a stack of services into it.

Note: ```docker-compose.yml``` references the image you upload to Docker Hub. Make sure you have built & uploaded the image if you made any edits.

```sh
> docker swarm init
> docker stack deploy -c docker-compose.yml some_app  # takes >30s
> docker service ps some_app_app # 5 instances on one host
> curl -i4 http://localhost:8000
> docker stack rm some_app
> docker swarm leave --force
```

If your containers are shutdown with log message "Killed", or take too long "Preparing", it means the ```deploy.resources``` defined in the ```docker-compose.yml``` file are insufficient. Increase the limits (or free resources) until your containers are kept.

## Part 4: Swarms

*Docker Machine development has stopped. Project is now in [maintenance mode](https://github.com/docker/machine/issues/4537)*.

> Here in [part 4](https://docs.docker.com/get-started/part4/#introduction), you deploy this application onto a cluster, running it on multiple machines. Multi-container, multi-machine applications are made possible by joining multiple machines into a “Dockerized” cluster called a swarm.

You will create 2 VMs. The first machine acts as the swarm manager; meaning it executes management commands & authenticates workers to join the swarm, and the second is a worker node in the swarm. Machines are using the virtualbox driver, as in the series. [Here](https://docs.docker.com/machine/drivers/) is all the available drivers.

Create the machines;

```sh
> docker-machine create -d virtualbox myvm1
> docker-machine create -d virtualbox myvm2
```
 Init a swarm in myvm1, and have myvm2 join it.

```sh
> MYVM1_IP=$(docker-machine ip myvm1)
> docker-machine ssh myvm1 "docker swarm init --advertise-addr $MYVM1_IP"
> JOIN_CMD=$(docker-machine ssh myvm1 "docker swarm join-token worker" | grep "\-\-token")
> docker-machine ssh myvm2 $JOIN_CMD
> docker-machine ssh myvm1 "docker node ls" # myvm2 status: ready
> docker-machine ssh myvm2 "docker swarm leave"
> docker-machine ssh myvm1 "docker node ls" # myvm2 status: down
> docker-machine ssh myvm1 "docker swarm leave --force"
```
---

Above commands are run via ssh'ing into the VMs. *Alternatively*, you can link your shell (terminal) to a machine, and your commands will be run against the Docker daemon there.

```sh
> docker-machine ls # no active machines
> env | grep DOCKER
> eval $(docker-machine env myvm1)
> docker-machine ls # myvm1 is active machine
> env | grep DOCKER
> docker swarm init # init on myvm1
```

If you are on Windows, you need to run ```docker-machine env myvm1``` to get the correct command. Above is for *nix.

If you are prompted to select an interface with the ```--advertise-addr``` flag, use the one that matches the ```$MYVM1_IP```.

```sh
> docker swarm init --advertise-addr eth1
```
---

Now that myvm1 init a swarm, and is the active machine, have myvm2 join;

```sh
> JOIN_CMD=$(docker swarm join-token worker | grep "\-\-token")
> docker-machine ssh myvm2 $JOIN_CMD
> docker node ls # 2 nodes
```

Finally, deploy the stack in ```docker-compose.yml``` to your swarm of 2 nodes. (assuming myvm1 is the active node). If the swarm manager node isn't linked with your shell (you instead ssh commands in), remote machine won't have access to your local filesystem. In that case;

* you need to copy the ```docker-compose.yml``` file over.
* machine won't have access to the ```DOCKER_USER``` env var. You will need to edit the ```docker-compose.yml``` file.

 ```sh
> docker stack deploy -c docker-compose.yml some_app # takes >1m
> docker service ps some_app_app
> curl -i http://$MYVM1_IP:8000 # 5 instances across 2 nodes
> docker ps
> docker-machine ssh myvm2 "docker ps"
```

A *stack* is the entire definition (services, networks, etc.) in your compose file. A *service* is a part of that definition. Each service corresponds to a container, that can be replicated multiple times, via the ```deploy.replicas``` key.

You can access your app through any one of the node IPs. In this case, ```curl -i http://$MYVM2_IP:8000``` also works.

---

If you change the number of nodes in the swarm, or if you scale up/down your service via the ```deploy``` key in ```docker-compose.yml```, you need to deploy your stack again for it to be affected by the changes.

Remember, if you modify your node app (or Dockerfile), you need to build & upload the image again.

To unset the DOCKER_ environment variables;
```sh
> eval $(docker-machine env -u)
```

## Part 5: Stacks

In this part, you are going to deploy the stack defined in ```dc.part5.yml```. Make sure;

* the swarm manager node (myvm1) is the active node
* the image you uploaded to Docker Hub is up-to-date

```sh
> docker stack deploy -c dc.part5.yml -c docker-compose.yml some_app
```

Difference from the stack in previous parts is the added *visualizer* service. The 2 services in this new stack are both on the *mynetwork* network. The *visualizer* service is only deployed to the manager node in the swarm, and it has access (via *volumes*) to the dockerd socket in the local filesystem (myvm1's) so that it can track metrics.

You can view it at ```http://$MYVM1_IP:8080```. That is a visualization of the ```docker stack ps some_app``` command. Even though the *visualizer* service is deployed to a single node, you can also access it from ```http://$MYVM2_IP:8080```.

The reason why every IP on the swarm will be able to access the service (as in the app) is the [routing mesh](https://docs.docker.com/get-started/part4/#accessing-your-cluster) the dockerized network implements.

---

Now you will add the ```redis``` service to the stack so you can persist some data. Adding the service means defining the container the redis image will run in.

Again,the service deployment is fixed to a single (manager) node. This is crucial since we want the **/data** folder, where the ```redis``` container stores its data, to always sync with the same host (myvm1) filesystem.

By default, the *myvm1* machine has a *docker* user, and thus a **/home/docker/** folder. By doing;

```yml
  volumes:
    - "/home/docker/data:/data"
```

You are telling the redis container to mount its internal **/data** folder as the **/home/docker/data** folder **local** to the machine it's deployed on (myvm1).

If you didn't mount the **/data** folder, you would lose the redis data when the container powers down. This way, you *persist* the data.

Create the **/data** folder on the local filesystem of the host machine;

```sh
> docker-machine ssh myvm1 "mkdir ./data" # /home/docker/data
```

```redis``` service definition is commented-out in ```dc.part5.yml``` - enable it, and then update the stack (on myvm1);

```sh
> docker stack deploy -c dc.part5.yml -c docker-compose.yml some_app
> docker stack ls
```

Now, your app has access to a redis service;

```sh
> curl -i $(docker-machine ip myvm1):8000/visit
> curl -i $(docker-machine ip myvm1):8000/visit?reset
```

> You learned that stacks are inter-related services all running in concert. You learned that to add more services to your stack, you insert them in your Compose file. Finally, you learned that by using a combination of placement constraints and volumes you can create a permanent home for persisting data, so that your app’s data survives when the container is torn down and redeployed.

## Part 6: Deploy

Docker Cloud is now [discontinued](http://success.docker.com/article/cloud-migration). Read [this](https://forums.docker.com/t/what-is-the-point-of-the-new-beta-swarm-mode/29180/26), and [this](https://www.reddit.com/r/docker/comments/85w2vd/docker_cloud_is_shutting_down/) discussion for context.

Suggested deployment method for your Docker containers is a managed k8s service; such as [GKE](https://cloud.google.com/kubernetes-engine/), [AKS](https://azure.microsoft.com/en-us/services/kubernetes-service/), or [EKS](https://aws.amazon.com/eks/).

---

### Docker v18.03 docs

```sh
> docker run -ti -p 4000:4000 docs/docker.github.io:latest # >2GB
```

### links

* cheatsheets: [official](https://www.docker.com/sites/default/files/Docker_CheatSheet_08.09.2016_0.pdf), [this](https://github.com/wsargent/docker-cheat-sheet), and [this](https://gist.github.com/d0ruk/76539f25be9a3831e1f7cb2dc6031572)

* [awesome docker](https://github.com/veggiemonk/awesome-docker)

* [/r/docker](http://reddit.com/r/docker/)
