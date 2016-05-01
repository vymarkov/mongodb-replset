TAG="$(node -p -e "require('./package.json').version")"
IMAGE_NAME=${IMAGE_NAME:-"lynx"}

docker build -t vymarkov/$IMAGE_NAME -f Dockerfile .
docker login --username $DOCKER_REGISTRY_USERNAME --email $DOCKER_REGISTRY_EMAIL --password $DOCKER_REGISTRY_PASS
docker tag vymarkov/$IMAGE_NAME vymarkov/$IMAGE_NAME:latest
docker push vymarkov/$IMAGE_NAME:latest

if [ "$TAG" != "latest" ]; then
	echo "Pushing an image with $TAG tag..."
	docker tag vymarkov/$IMAGE_NAME vymarkov/$IMAGE_NAME:$TAG
	docker push "vymarkov/$IMAGE_NAME:$TAG"
fi