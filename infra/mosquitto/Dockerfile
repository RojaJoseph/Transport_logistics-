FROM eclipse-mosquitto:2

# Copy custom config
COPY mosquitto.conf /mosquitto/config/mosquitto.conf

# Ensure data & log dirs exist and are writable
RUN mkdir -p /mosquitto/data /mosquitto/log \
    && chown -R mosquitto:mosquitto /mosquitto

EXPOSE 1883 9001

CMD ["/usr/sbin/mosquitto", "-c", "/mosquitto/config/mosquitto.conf"]
