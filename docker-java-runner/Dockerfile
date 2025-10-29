# Use a Debian-based OpenJDK image
FROM openjdk:17-jdk-slim

# Set the working directory in the container
WORKDIR /app

# Copy your Java source file into the container
COPY Main.java .

# Compile the Java code
RUN javac Main.java

# Set the command to run the compiled Java program
CMD ["java", "-cp", ".", "Main"]
