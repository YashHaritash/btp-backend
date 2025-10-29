# Use an official image with g++ pre-installed
FROM gcc:latest

# Set the working directory inside the container
WORKDIR /app

# Copy the C++ code file into the container (dynamic binding happens at runtime)
COPY code.cpp /app/code.cpp

# Command to compile and execute the code
CMD ["sh", "-c", "g++ code.cpp -o code && ./code"]
