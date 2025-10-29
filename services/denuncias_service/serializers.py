from rest_framework import serializers
from .models import Denuncia, DenunciaEvidencia
from users_service.serializers import UserProfileSerializer


class DenunciaEvidenciaSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = DenunciaEvidencia
        fields = ['id', 'file', 'file_url', 'file_type', 'uploaded_at']
        read_only_fields = ['id', 'uploaded_at']
    
    def get_file_url(self, obj):
        request = self.context.get('request')
        if obj.file and hasattr(obj.file, 'url'):
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None


class DenunciaSerializer(serializers.ModelSerializer):
    user = UserProfileSerializer(read_only=True)
    user_id = serializers.IntegerField(write_only=True, required=False)
    evidence = DenunciaEvidenciaSerializer(many=True, read_only=True)
    
    class Meta:
        model = Denuncia
        fields = [
            'id', 'user', 'user_id', 'description', 'created_at',
            'district', 'region', 'lat', 'lon', '_type', 'status', 'evidence'
        ]
        read_only_fields = ['id', 'created_at', 'user']
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        validated_data.pop('user_id', None) 
        return super().create(validated_data)


class DenunciaCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Denuncia
        fields = [
            'description', 'district', 'region', 'lat', 'lon', '_type', 'status'
        ]
    
    def validate_description(self, value):
        if len(value.strip()) < 20:
            raise serializers.ValidationError(
                "La descripción debe tener al menos 20 caracteres."
            )
        return value


class DenunciaListSerializer(serializers.ModelSerializer):
    avatar = serializers.SerializerMethodField()
    user_email = serializers.EmailField(source='user.email', read_only=True)
    full_name = serializers.SerializerMethodField()
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    _type_display = serializers.CharField(source='get__type_display', read_only=True)
    evidence_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Denuncia
        fields = [
            'id', 'user_email', 'full_name', 'user_id', 'description', 'created_at',
            'district', 'region', 'lat', 'lon', '_type', '_type_display', 'status', 'evidence_count', 'avatar'
        ]
    
    def get_full_name(self, obj):
        return obj.user.full_name
    
    def get_evidence_count(self, obj):
        return obj.evidence.count()
    
    def get_avatar(self, obj):
        request = self.context.get('request')
        if obj.user.avatar and hasattr(obj.user.avatar, 'url'):
            if request:
                return request.build_absolute_uri(obj.user.avatar.url)
            return obj.user.avatar.url
        return None

class DenunciaStatusUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Denuncia
        fields = ['status']
