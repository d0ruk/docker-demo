## This is a walkthrough of the Docker [Get Started](https://docs.docker.com/get-started/) series.

## Part 2: Containers

### Build the image

```sh
> docker build -t docker_demo:build .
> docker run --name get_started -p 8000:3001 docker_demo:build npm run dev
> curl -i http://localhost:8000
```

If you want to build a new image with the same name, you need to remove the old one;

```sh
> docker rm get_started
```

For the container to work in the background, we need to run the image in detached mode;

```sh
> docker run -d --name get_started -p 8000:3001 docker_demo:build npm run dev
```

To see the log output of a container in detached mode;

```sh
> docker logs -f get_started
```

### Push the image

You need to have registered with the Docker Hub, completed ```docker login```, and set the DOCKER_USER env var.

```sh
> export DOCKER_USER=<your-docker-hub-username>
> docker tag docker_demo:build ${DOCKER_USER}/docker_demo:latest
> docker push ${DOCKER_USER}/docker_demo:latest
```

## Part 3: Services

We init a swarm on our physical machine, thus making it the manager node, and then deploying a stack of services into it.

Note: ```docker-compose.yml``` references the image you uploaded to docker hub. Make sure you have built & uploaded the image for your changes to take effect when deployed.

```sh
> docker swarm init
> docker stack deploy -c docker-compose.yml some_app  # takes >30s
> docker service ps some_app_app
> curl -i4 http://localhost:8000 # 5 instances
> docker stack rm some_app
> docker swarm leave --force
```
## Part 4: Swarms

> Here in [part 4](https://docs.docker.com/get-started/part4/#introduction), you deploy this application onto a cluster, running it on multiple machines. Multi-container, multi-machine applications are made possible by joining multiple machines into a “Dockerized” cluster called a swarm.

We create 2 VMs. The first machine acts as the manager, which executes management commands & authenticates workers to join the swarm, and the second is a worker node in the swarm. Machines are using the virtualbox driver, as in the series. [Here](https://docs.docker.com/machine/drivers/) is all the available drivers.

Create the machines.

```sh
> docker-machine create -d virtualbox myvm1
> docker-machine create -d virtualbox myvm2
```
 Init a swarm in myvm1, and tell myvm2 to join it.

```sh
> MYVM1_IP=$(docker-machine inspect myvm1 --format="{{.Driver.IPAddress}}")
> docker-machine ssh myvm1 "docker swarm init --advertise-addr $MYVM1_IP"
> JOIN_CMD=$(docker-machine ssh myvm1 "docker swarm join-token worker" | grep "\-\-token")
> docker-machine ssh myvm2 $JOIN_CMD
> docker-machine ssh myvm1 "docker node ls"
> docker-machine ssh myvm2 "docker swarm leave" # takes >10s
> docker-machine ssh myvm1 "docker node ls"
> docker-machine ssh myvm1 "docker swarm leave --force"
```
---

Above commands are run via ssh'ing individual commands to the VMs. *Alternatively*, you can link your shell (terminal) to a VM, and your commands will be run against the Docker daemon in that machine.

```sh
> docker-machine ls # no active machines
> env | grep DOCKER
> eval $(docker-machine env myvm1)
> docker-machine ls # myvm1 is active machine
> env | grep DOCKER
> docker swarm init # run against myvm1
```

If you're on Windows, you need to run ```docker-machine env myvm1``` to get the correct command. Above is for *nix.

If you are prompted to select an interface with the ```--advertise-addr``` flag, use the one that matches the ```$MYVM1_IP```.

```sh
> docker swarm init --advertise-addr eth1
> docker node ls # myvm1 is the only node
```

Now that myvm1 is init & active, have myvm2 join its swarm.

```sh
> JOIN_CMD=$(docker swarm join-token worker | grep "\-\-token")
> docker-machine ssh myvm2 $JOIN_CMD
> docker node ls # 2 nodes
```

Finally, deploy the stack in ```docker-compose.yml``` to your swarm of 2 nodes. (assuming myvm1 is the active node). If the swarm manager node isn't linked to your shell (you instead ssh commands in), remote machine won't have access to your local filesystem, and thus you need to copy the ```docker-compose.yml``` file over.

```sh
> docker stack deploy -c docker-compose.yml some_app # takes >1m
> docker service ps some_app_app
> curl -i http://$MYVM1_IP:8000 # 5 instances across 2 nodes
```

You can access your app through any one of the node IPs. In this case, ```curl -i http://$MYVM2_IP:8000``` also works.

---

If you change the number of nodes in the swarm, or if you scale up/down your service via the ```deploy``` key in ```docker-compose.yml```, you need to deploy your stack again for it to be affected by the changes.

Remember, if you modify your image (Dockerfile), you need to build&upload it again.

To unset the DOCKER_ environment variables;
```sh
> eval $(docker-machine env -u)
```

Note: If you deploy your stack by ssh'ing into the swarm manager (first alternative), machine won't have access to the ```DOCKER_USER``` env var. You will need to edit the ```docker-compose.yml``` file.
