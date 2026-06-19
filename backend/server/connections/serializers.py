from rest_framework import serializers

from .crypto import decrypt_json, encrypt_json
from .models import DataConnection


class DataConnectionSerializer(serializers.ModelSerializer):
    secret = serializers.JSONField(write_only=True, required=False)

    class Meta:
        model = DataConnection
        fields = (
            "id",
            "public_id",
            "name",
            "kind",
            "config",
            "secret",
            "is_active",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "public_id", "created_at", "updated_at")

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["has_secret"] = bool(instance.secret_encrypted)
        return data

    def create(self, validated_data):
        secret = validated_data.pop("secret", {}) or {}
        instance = super().create(
            {
                **validated_data,
                "secret_encrypted": encrypt_json(secret) if secret else "",
            }
        )
        return instance

    def update(self, instance, validated_data):
        secret = validated_data.pop("secret", None)
        if secret is not None:
            instance.secret_encrypted = encrypt_json(secret) if secret else ""
        return super().update(instance, validated_data)


class ConnectionTestResultSerializer(serializers.Serializer):
    ok = serializers.BooleanField()
    message = serializers.CharField()

