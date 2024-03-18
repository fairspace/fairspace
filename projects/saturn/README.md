# Saturn

This service contains the core logic of Fairspace. Saturn is a Java application that provides a REST API to interact
with the Fairspace backend as well as an Apache Jena Fuseki server to store and query RDF data.

For a detailed description of the service, see the [Fairspace documentation](../../README.adoc).

## Development

### Running the app in development mode

Prerequisites:

- Java 21
- Gradle
- PostgreSQL instance running (optional)
- Keycloak instance running

To run the application, execute the main method in the [App](src/main/java/io/fairspace/saturn/App.java) class or execute the following command:

```bash
./gradlew run
```

### Code style

To ensure a consistent code style, we use the Spotless Gradle plugin. The plugin config is based on Palantir's code style with a few modifications. See the [Gradle file](build.gradle) for the exact configuration.
To format the code, run the following command:

```bash
./gradlew :spotlessApply
```

NOTE: The Spotless plugin also runs as part of the CI pipeline. Build will fail if the code is not formatted correctly.


