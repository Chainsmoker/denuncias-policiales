from rest_framework import serializers
from .models import User
from django.contrib.auth.password_validation import validate_password

class UserSerializer(serializers.ModelSerializer):
    avatar = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'dni', 'email', 'first_name', 'last_name', 'full_name',
            'phone', 'region', 'distrito', 'address', 'gender',
            'avatar', 'date_joined', 'is_active', 'is_staff', 'is_superuser'
        ]
        read_only_fields = ['id', 'date_joined']
        
    def get_avatar(self, obj):
        request = self.context.get('request')
        if obj.avatar and hasattr(obj.avatar, 'url'):
            if request is not None:
                return request.build_absolute_uri(obj.avatar.url)
            return obj.avatar.url
        return None

class UserUpdateSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(required=True)
    
    class Meta:
        model = User
        fields = [
            'first_name', 'last_name', 'phone', 'region',
            'distrito', 'address', 'gender', 'email', 'avatar',
            'is_active', 'is_staff', 'is_superuser'
        ]
        
    def validate_email(self, value):
        user = self.instance
        if User.objects.exclude(pk=user.pk).filter(email=value).exists():
            raise serializers.ValidationError("Este correo electrónico ya está en uso.")
        return value

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id', 'dni', 'email', 'first_name', 'last_name', 'full_name',
            'phone', 'region', 'distrito', 'address', 'gender',
            'avatar', 'date_joined', 'is_active', 'is_staff', 'is_superuser'
        ]
        read_only_fields = ['id', 'dni', 'date_joined', 'is_active', 'is_staff', 'is_superuser']
        
    def get_avatar_url(self, obj):
        request = self.context.get('request')
        if obj.avatar:
            if request is not None:
                return request.build_absolute_uri(obj.avatar.url)
            return obj.avatar.url
        return None

class UserProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'first_name', 'last_name', 'phone', 'region',
            'distrito', 'address', 'gender', 'email', 'avatar'
        ]
        
    def validate_email(self, value):
        user = self.instance
        if User.objects.exclude(pk=user.pk).filter(email=value).exists():
            raise serializers.ValidationError("Este correo electrónico ya está en uso.")
        return value

class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True, min_length=8)
    confirm_password = serializers.CharField(required=True, write_only=True, min_length=8)
    
    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("La contraseña actual es incorrecta.")
        return value
    
    def validate(self, data):
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError({
                'confirm_password': 'Las contraseñas nuevas no coinciden.'
            })
        
        user = self.context['request'].user
        validate_password(data['new_password'], user)
        
        return data
    
    def save(self, **kwargs):
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save()
        return user

