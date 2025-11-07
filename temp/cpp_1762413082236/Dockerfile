FROM gcc:latest
WORKDIR /app
COPY . .
RUN g++ -std=c++17 utils.cpp -o output
CMD ["./output"]