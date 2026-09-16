// Spring Boot — Maven or Gradle wrapper build, then (with multi-stage on)
// Spring Boot's own `-Djarmode=layertools` split into layers so dependency
// layers stay cached across rebuilds that only touch application code.

import type { GeneratedFiles, TemplateOptions } from '../types';
import {
  alpineNonRootUser,
  buildDockerignore,
  CACHE_MOUNT_SYNTAX_PRAGMA,
  commandBlock,
  formatArgs,
  formatEnv,
  formatExpose,
  formatHealthcheck,
  formatLabels,
  joinBlocks,
} from './shared';

const JAR_LAUNCHER_CMD = '["java", "org.springframework.boot.loader.launch.JarLauncher"]';

function buildCommand(options: TemplateOptions): {
  copyManifest: string;
  chmodWrapper: string;
  run: string;
  jarGlob: string;
} {
  if (options.javaBuildTool === 'maven') {
    return {
      copyManifest: 'COPY mvnw pom.xml ./\nCOPY .mvn .mvn',
      chmodWrapper: 'RUN chmod +x ./mvnw',
      run: options.cacheMounts
        ? 'RUN --mount=type=cache,target=/root/.m2 ./mvnw -B -DskipTests package'
        : 'RUN ./mvnw -B -DskipTests package',
      jarGlob: 'target/*.jar',
    };
  }
  return {
    copyManifest: 'COPY gradlew build.gradle* settings.gradle* ./\nCOPY gradle gradle',
    chmodWrapper: 'RUN chmod +x ./gradlew',
    run: options.cacheMounts
      ? 'RUN --mount=type=cache,target=/root/.gradle ./gradlew --no-daemon bootJar -x test'
      : 'RUN ./gradlew --no-daemon bootJar -x test',
    jarGlob: 'build/libs/*.jar',
  };
}

export function generateSpringBoot(options: TemplateOptions): GeneratedFiles {
  const jdkImage = `eclipse-temurin:${options.baseVersion}-jdk-alpine`;
  const jreImage = `eclipse-temurin:${options.baseVersion}-jre-alpine`;
  const { copyManifest, chmodWrapper, run, jarGlob } = buildCommand(options);
  const nonRootSetup = options.nonRoot ? alpineNonRootUser(options.nonRootUser, options.nonRootUid) : '';

  const builderStage = joinBlocks(
    `FROM ${jdkImage} AS builder`,
    `WORKDIR ${options.workdir}`,
    copyManifest,
    chmodWrapper,
    'COPY src src',
    run,
  );

  const dockerfile = options.multiStage
    ? joinBlocks(
        options.cacheMounts ? CACHE_MOUNT_SYNTAX_PRAGMA : '',
        builderStage,
        joinBlocks(
          `FROM ${jreImage} AS layers`,
          'WORKDIR /layers',
          `COPY --from=builder ${options.workdir}/${jarGlob} app.jar`,
          'RUN java -Djarmode=layertools -jar app.jar extract',
        ),
        joinBlocks(
          `FROM ${jreImage} AS runner`,
          formatArgs(options.buildArgs),
          nonRootSetup,
          `WORKDIR ${options.workdir}`,
          'COPY --from=layers /layers/dependencies/ ./',
          'COPY --from=layers /layers/spring-boot-loader/ ./',
          'COPY --from=layers /layers/snapshot-dependencies/ ./',
          'COPY --from=layers /layers/application/ ./',
          options.nonRoot ? `RUN chown -R ${options.nonRootUser}:${options.nonRootUser} ${options.workdir}` : '',
          options.nonRoot ? `USER ${options.nonRootUser}` : '',
          formatEnv(options.envVars),
          formatExpose(options.ports),
          formatHealthcheck(options.healthcheck),
          formatLabels(options.labels),
          commandBlock(options.entrypointOverride, options.cmdOverride, JAR_LAUNCHER_CMD),
        ),
      )
    : joinBlocks(
        `FROM ${jdkImage}`,
        formatArgs(options.buildArgs),
        `WORKDIR ${options.workdir}`,
        copyManifest,
        chmodWrapper,
        'COPY src src',
        run,
        `RUN cp ${jarGlob} app.jar`,
        nonRootSetup,
        options.nonRoot ? `RUN chown -R ${options.nonRootUser}:${options.nonRootUser} ${options.workdir}` : '',
        options.nonRoot ? `USER ${options.nonRootUser}` : '',
        formatEnv(options.envVars),
        formatExpose(options.ports),
        formatHealthcheck(options.healthcheck),
        formatLabels(options.labels),
        commandBlock(options.entrypointOverride, options.cmdOverride, '["java", "-jar", "app.jar"]'),
      );

  const dockerignore = buildDockerignore(['target', 'build', '.gradle', '.mvn/wrapper', '*.jar', '!gradle/wrapper/*.jar']);

  return { dockerfile: `${dockerfile}\n`, dockerignore };
}
