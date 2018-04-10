## Build the image

```sh
> docker build -t docker_demo:build .
> docker run -p 8000:3001 docker_demo:build
> curl http://localhost:8000
```

## Push the image

You need to have registered with the Docker Hub, completed ```docker login```, and set the DOCKER_USER env var.

```sh
> docker tag docker_demo:build ${DOCKER_USER}/docker_demo:latest
> docker push ${DOCKER_USER}/docker_demo:latest
```
## Deploy service

```sh
> docker swarm init
> docker stack deploy -c docker-compose.yml some_app
> docker service ps some_app_app
> docker stack rm some_app
> docker swarm leave --force

```

