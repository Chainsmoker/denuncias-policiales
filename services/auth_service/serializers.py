from rest_framework import serializers
from users_service.models import User
from django.contrib.auth import authenticate
from rest_framework.validators import UniqueValidator
from .utils.reniec import validate_dni

class UserRegistrationSerializer(serializers.ModelSerializer):
    dni = serializers.CharField(
        max_length=8,
        validators=[
            UniqueValidator(
                queryset=User.objects.all(),
                message="Ya existe un usuario registrado con este DNI."
            )
        ]
    )
    email = serializers.EmailField(
        validators=[
            UniqueValidator(
                queryset=User.objects.all(),
                message="Ya existe un usuario registrado con este correo."
            )
        ],
        error_messages={'required': 'El correo electrónico es obligatorio.'}
    )
    password = serializers.CharField(
        write_only=True,
        min_length=8,
        style={'input_type': 'password'},
        error_messages={'min_length': 'La contraseña debe tener al menos 8 caracteres.'}
    )
    password_confirm = serializers.CharField(
        write_only=True,
        min_length=8,
        style={'input_type': 'password'}
    )

    class Meta:
        model = User
        fields = [
            'dni', 'email', 'password', 'password_confirm',
            'first_name', 'last_name', 'phone',
            'region', 'distrito', 'address', 'gender',
        ]
        extra_kwargs = {
            'first_name': {'required': False, 'allow_blank': True},
            'last_name': {'required': False, 'allow_blank': True},
            'phone': {'required': False, 'allow_blank': True},
            'region': {'required': False, 'allow_blank': True},
            'distrito': {'required': False, 'allow_blank': True},
            'address': {'required': False, 'allow_blank': True},
            'gender': {'required': False, 'allow_blank': True},
        }

    def validate_dni(self, value):
        if not value.isdigit() or len(value) != 8:
            raise serializers.ValidationError("El DNI debe contener exactamente 8 dígitos numéricos.")
        return value

    def validate(self, data):
        if data.get('password') != data.get('password_confirm'):
            raise serializers.ValidationError({'password_confirm': 'Las contraseñas no coinciden.'})
        return data

    def create(self, validated_data):
        dni = validated_data['dni']
        result = validate_dni(dni)
        
        if not result or not all(k in result for k in ['nombres', 'apellidoPaterno', 'apellidoMaterno']):
            raise serializers.ValidationError({'dni': "El DNI proporcionado no es válido."})

        first_name = result.get('nombres', '').strip().lower()
        last_name = f"{result.get('apellidoPaterno', '')} {result.get('apellidoMaterno', '')}".strip().lower()

        validated_data['first_name'] = first_name
        validated_data['last_name'] = last_name

        validated_data.pop('password_confirm', None)
        password = validated_data.pop('password')

        user = User.objects.create_user(password=password, **validated_data)
        return user
    
class UserLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, style={'input_type': 'password'})
    
    def validate(self, data):
        email = data.get('email')
        password = data.get('password')

        if email and password:
            user = authenticate(username=email, password=password)

            if not user:
                raise serializers.ValidationError(
                    'Email o contraseña incorrectos.',
                    code='authorization'
                )
            
            if not user.is_active:
                raise serializers.ValidationError(
                    'Esta cuenta está desactivada.',
                    code='authorization'
                )
        else:
            raise serializers.ValidationError(
                'Debe incluir "email" y "password".',
                code='authorization'
            )
        
        data['user'] = user
        return data

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id', 'dni', 'email', 'first_name', 'last_name', 'full_name',
            'phone', 'region', 'distrito', 'address', 'gender',
            'avatar', 'date_joined', 'is_superuser', 'is_staff', 'is_active'
        ]
        read_only_fields = ['id', 'date_joined', 'is_active']
        
        
    def to_representation(self, instance):
        representation = super().to_representation(instance)
        request = self.context.get('request')

        if instance.avatar and hasattr(instance.avatar, 'url'):
            avatar_url = instance.avatar.url
            if request:
                avatar_url = request.build_absolute_uri(avatar_url)
            representation['avatar'] = avatar_url
        else:
            representation['avatar'] = None

        return representation
