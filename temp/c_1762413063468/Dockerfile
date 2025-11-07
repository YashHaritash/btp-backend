FROM gcc:latest
WORKDIR /app
COPY . .
RUN gcc utils.h -o output
CMD ["./output"]