.PHONY: test standard showcase

test:
	npm run test:coverage

standard:
	npx standard --fix

showcase:
	npm run showcase