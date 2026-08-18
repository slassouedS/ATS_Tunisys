# syntax=docker/dockerfile:1

# ── Stage 1 : build Maven ──
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .

# Cache monte (persiste entre les tentatives de build, meme en cas d'echec) :
# si le telechargement est interrompu par un incident reseau, la prochaine
# tentative repart de ce qui a deja ete telecharge au lieu de tout refaire.
#
# Retry au niveau shell (pas au niveau Maven) : Maven 3.9+ utilise par defaut
# un transport HTTP moderne (pas le vieux "wagon"), donc les proprietes
# maven.wagon.http.retryHandler.* n'ont aucun effet et Maven abandonne au
# premier echec SSL. On boucle donc nous-memes, comme pour le modele IA.
RUN --mount=type=cache,target=/root/.m2,sharing=locked \
    for i in 1 2 3 4 5 6 7 8; do \
      mvn -B dependency:go-offline && break || \
      { echo ">>> Tentative $i echouee (incident reseau probable), nouvel essai dans 15s..."; sleep 15; }; \
    done

COPY src ./src
RUN --mount=type=cache,target=/root/.m2,sharing=locked \
    for i in 1 2 3 4 5 6 7 8; do \
      mvn -B clean package -DskipTests && break || \
      { echo ">>> Tentative $i echouee (incident reseau probable), nouvel essai dans 15s..."; sleep 15; }; \
    done && test -f /app/target/ats-backend.jar

# ── Stage 2 : image d'exécution minimale ──
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN addgroup -S tunisys && adduser -S tunisys -G tunisys
COPY --from=build /app/target/ats-backend.jar app.jar
USER tunisys
EXPOSE 8080
ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-jar", "app.jar"]
