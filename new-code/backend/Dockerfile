FROM m.daocloud.io/docker.io/library/maven:3.9.11-eclipse-temurin-21 AS builder

WORKDIR /src
COPY pom.xml .
RUN mvn -q -DskipTests dependency:go-offline
COPY src ./src
RUN mvn -q -DskipTests clean package

FROM m.daocloud.io/docker.io/library/eclipse-temurin:21-jre

WORKDIR /app
COPY --from=builder /src/target/knowledge-hub-backend-spring-0.0.1-SNAPSHOT.jar app.jar

EXPOSE 8001

CMD ["java", "-jar", "app.jar"]
