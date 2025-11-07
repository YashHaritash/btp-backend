FROM gcc:latest
WORKDIR /app
COPY . .
RUN gcc calculator.h -o output
CMD ["./output"]