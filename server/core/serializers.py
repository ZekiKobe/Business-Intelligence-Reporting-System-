from django.contrib.auth import authenticate
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import Membership, Tenant, TenantBranding, User


class ExternalLoginSerializer(serializers.Serializer):
    username = serializers.CharField(required=False, allow_blank=True)
    email = serializers.CharField(required=False, allow_blank=True)
    password = serializers.CharField()
    tenant_slug = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        username = (attrs.get("username") or "").strip()
        email = (attrs.get("email") or "").strip()
        password = attrs.get("password")

        identifier = email or username
        if not identifier:
            raise serializers.ValidationError("username or email is required")

        # Try both username and email to match both frontends.
        user = authenticate(
            request=self.context.get("request"),
            username=identifier,
            password=password,
        )
        if user is None and email:
            try:
                u = User.objects.get(email=email)
            except User.DoesNotExist:
                u = None
            if u:
                user = authenticate(
                    request=self.context.get("request"),
                    username=u.username,
                    password=password,
                )

        if user is None:
            raise serializers.ValidationError("Invalid credentials")

        attrs["user"] = user
        return attrs


class TenantTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # tenant_slug is set later by the view when we pick a tenant.
        return token


class TenantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tenant
        fields = ("id", "name", "slug", "is_active", "created_at")


class MembershipSerializer(serializers.ModelSerializer):
    tenant = TenantSerializer()

    class Meta:
        model = Membership
        fields = ("id", "role", "status", "tenant", "created_at")


class UserCreateSerializer(serializers.Serializer):
    name = serializers.CharField()
    # Optional for backwards compatibility with older dashboard bundles. The current
    # form always supplies it; absent values are safely generated from the email.
    username = serializers.CharField(max_length=150, required=False, allow_blank=True)
    email = serializers.EmailField()
    role = serializers.ChoiceField(choices=Membership.Role.choices, required=False)
    status = serializers.CharField(required=False, default="Active")
    password = serializers.CharField()

    def validate_username(self, value):
        username = value.strip()
        if not username:
            return ""
        if User.objects.filter(username__iexact=username).exists():
            raise serializers.ValidationError("Username already taken")
        return username

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Email already registered")
        return value

    def create(self, validated_data):
        name = validated_data["name"]
        email = validated_data["email"]
        password = validated_data["password"]
        role = validated_data.get("role") or Membership.Role.VIEWER
        status = validated_data.get("status") or "Active"
        tenant: Tenant = self.context["tenant"]

        username = validated_data.get("username", "")
        if not username:
            base_username = email.split("@", 1)[0]
            username = base_username
            suffix = 1
            while User.objects.filter(username__iexact=username).exists():
                suffix += 1
                username = f"{base_username}{suffix}"

        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            full_name=name,
        )
        Membership.objects.create(user=user, tenant=tenant, role=role, status=status)
        return user


class UserUpdateSerializer(serializers.Serializer):
    name = serializers.CharField(required=False, allow_blank=True)
    username = serializers.CharField(max_length=150, required=False)
    email = serializers.EmailField(required=False)
    role = serializers.ChoiceField(choices=Membership.Role.choices, required=False)
    status = serializers.CharField(required=False)
    password = serializers.CharField(required=False, allow_blank=True)

    def validate_username(self, value):
        username = value.strip()
        if not username:
            raise serializers.ValidationError("Username cannot be empty")
        target_user = self.context.get("target_user")
        qs = User.objects.filter(username__iexact=username)
        if target_user:
            qs = qs.exclude(id=target_user.id)
        if qs.exists():
            raise serializers.ValidationError("Username already taken")
        return username

    def validate_email(self, value):
        target_user = self.context.get("target_user")
        qs = User.objects.filter(email__iexact=value)
        if target_user:
            qs = qs.exclude(id=target_user.id)
        if qs.exists():
            raise serializers.ValidationError("Email already registered")
        return value

    def update(self, instance, validated_data):
        membership = self.context.get("membership")
        if "name" in validated_data:
            instance.full_name = validated_data["name"]
        if "username" in validated_data:
            instance.username = validated_data["username"]
        if "email" in validated_data:
            instance.email = validated_data["email"]
        password = validated_data.get("password")
        if password and str(password).strip():
            instance.set_password(str(password).strip())
        instance.save()

        if membership:
            if "role" in validated_data and validated_data["role"]:
                membership.role = validated_data["role"]
            if "status" in validated_data and validated_data["status"]:
                membership.status = validated_data["status"]
            membership.save()
        return instance


class RegisterSerializer(serializers.Serializer):
    name = serializers.CharField()
    username = serializers.CharField(required=False, allow_blank=True)
    email = serializers.EmailField()
    password = serializers.CharField(min_length=8)
    tenant_slug = serializers.CharField(required=False, allow_blank=True)

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email already registered")
        return value

    def validate_username(self, value):
        if value and User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Username already taken")
        return value

    def create(self, validated_data):
        tenant_slug = (validated_data.get("tenant_slug") or "").strip()
        if tenant_slug:
            tenant = Tenant.objects.filter(slug=tenant_slug).first()
            if not tenant:
                raise serializers.ValidationError({"tenant_slug": "Tenant not found"})
        else:
            tenant, _ = Tenant.objects.get_or_create(
                slug="default", defaults={"name": "Default"}
            )

        username = (validated_data.get("username") or "").strip()
        if not username:
            base_username = validated_data["email"].split("@")[0]
            username = base_username
            idx = 1
            while User.objects.filter(username=username).exists():
                idx += 1
                username = f"{base_username}{idx}"

        user = User.objects.create_user(
            username=username,
            email=validated_data["email"],
            password=validated_data["password"],
            full_name=validated_data["name"],
        )
        Membership.objects.create(
            user=user,
            tenant=tenant,
            role=Membership.Role.VIEWER,
            status="Active",
        )
        return user


def branding_to_camel(instance: TenantBranding) -> dict:
    return {
        "companyName": instance.company_name,
        "productName": instance.product_name,
        "tagline": instance.tagline,
        "logoUrl": instance.logo_url,
        "primaryColor": instance.primary_color,
        "accentColor": instance.accent_color,
        "darkMode": instance.dark_mode,
    }


class PortalBrandingWriteSerializer(serializers.Serializer):
    companyName = serializers.CharField(required=False, max_length=200)
    productName = serializers.CharField(required=False, max_length=200)
    tagline = serializers.CharField(required=False, allow_blank=True, max_length=500)
    logoUrl = serializers.CharField(required=False, allow_blank=True, max_length=2000)
    primaryColor = serializers.CharField(required=False, max_length=32)
    accentColor = serializers.CharField(required=False, max_length=32)
    darkMode = serializers.BooleanField(required=False)

    def update(self, instance: TenantBranding, validated_data: dict) -> TenantBranding:
        field_map = {
            "companyName": "company_name",
            "productName": "product_name",
            "tagline": "tagline",
            "logoUrl": "logo_url",
            "primaryColor": "primary_color",
            "accentColor": "accent_color",
            "darkMode": "dark_mode",
        }
        for camel, snake in field_map.items():
            if camel in validated_data:
                setattr(instance, snake, validated_data[camel])
        instance.save()
        return instance

