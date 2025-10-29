# Use official gcc base image
FROM gcc:latest

# Set working directory in the container
WORKDIR /app

# Copy the C source code into the container
COPY code.c /app/code.c

# List files in the working directory
RUN ls -la /app

# Compile the C code
RUN gcc code.c -o code

# List files after compilation
RUN ls -la /app

# Command to run the compiled code
CMD ./code