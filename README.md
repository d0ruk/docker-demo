## This is a walkthrough of the Docker [Get Started](https://docs.docker.com/get-started/) series.

# Part 2

### Build the image

```sh
> docker build -t docker_demo:build .
> docker run -p 8000:3001 docker_demo:build npm start
> curl -i http://localhost:8000
```

### Push the image

You need to have registered with the Docker Hub, completed ```docker login```, and set the DOCKER_USER env var.

```sh
> export DOCKER_USER=<username>
> docker tag docker_demo:build ${DOCKER_USER}/docker_demo:latest
> docker push ${DOCKER_USER}/docker_demo:latest
```

# Part 3

### Deploy service

We init a swarm on our physical machine, thus making it the manager node, and then deploying a stack of services into it.

Note: ```docker-compose.yml``` references the image you uploaded to docker hub. Make sure you have built & uploaded the image for your changes to take effect when deployed.

```sh
> docker swarm init
> docker stack deploy -c docker-compose.yml some_app
> docker service ps some_app_app
> curl -i4 http://localhost:8000 # 5 instances
> docker stack rm some_app
> docker swarm leave --force
```
# Part 4

### Swarm

We create 2 VMs. The first machine acts as the manager, which executes management commands & authenticates workers to join the swarm, and the second is a worker. Machines are using the virtualbox driver, as in the series. [Here](https://docs.docker.com/machine/drivers/) is all the available drivers.

Create the machines.

```sh
> docker-machine create --driver virtualbox myvm1
> docker-machine create --driver virtualbox myvm2
```
 Init a swarm in myvm1, and tell myvm2 to join it.

```sh
> MYVM1_IP=$(docker-machine inspect myvm1 --format="{{.Driver.IPAddress}}")
> docker-machine ssh myvm1 "docker swarm init --advertise-addr $MYVM1_IP"
> JOIN_CMD=$(docker-machine ssh myvm1 "docker swarm join-token worker" | grep "\-\-token")
> docker-machine ssh myvm2 $JOIN_CMD
> docker node ls
> eval $(docker-machine env myvm1)
> docker node ls
> docker swarm leave --force
```
Above commands are run via ssh'ing into the VMs. *Alternatively*, you can set environment variables against a particular machine in your shell, and docker-* CLIs target that VM when running commands.

```sh
> docker-machine ls # no active machines
> env | grep DOCKER
> eval $(docker-machine env myvm1)
> docker-machine ls # myvm1 is active machine
> env | grep DOCKER
> docker swarm init
```

If you are prompted to select an interface with the ```--advertise-addr``` flag, use the one that matches the ```$MYVM1_IP```.

```sh
> docker swarm init --advertise-addr eth1
> docker node ls # myvm1 is the only node
```

To drop back into your own shell (revert the process);
```sh
> eval $(docker-machine env -u)
```

Have myvm2 join the swarm. It doesn't matter which machine you run this from.

```sh
> JOIN_CMD=$(docker swarm join-token worker | grep "\-\-token")
> docker-machine ssh myvm2 $JOIN_CMD
> docker node ls # 2 nodes
```

When you use the 2nd way of running commands in your VM, you have access to your local filesystem. You can use the same deploy command from Part 3, as if deploying to your local swarm.

Deploy the stack to your swarm of 2 nodes. (assuming you are targeting myvm1).

```sh
> docker stack deploy -c docker-compose.yml some_app
> docker service ps some_app_app
> curl -i http://$MYVM1_IP:8000 # 5 instances across 2 nodes
```

If you change the number of nodes in the swarm, or if you scale up/down your service via the ```deploy``` key in ```docker-compose.yml```, you need to deploy your stack again for it to be affected by the changes.

You can access your app through any one of the node IPs. In this case, ```http://$MYVM2_IP:8000``` also works.

Note: If you deploy your stack by ssh'ing into the swarm manager, machine won't have access to the ```DOCKER_USER``` env var.

