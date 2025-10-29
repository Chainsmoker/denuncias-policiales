from django.core.management.base import BaseCommand
from users_service.models import User
from faker import Faker
import random

fake = Faker('es_ES')

class Command(BaseCommand):
    help = 'Genera 100 usuarios de prueba con datos aleatorios'

    def add_arguments(self, parser):
        parser.add_argument(
            '--count',
            type=int,
            default=100,
            help='Número de usuarios a crear (por defecto: 100)'
        )

    def handle(self, *args, **options):
        count = options['count']
        
        regiones = [
            'Amazonas', 'Ancash', 'Apurimac', 'Arequipa', 'Ayacucho',
            'Cajamarca', 'Callao', 'Cusco', 'Huancavelica', 'Huanuco',
            'Ica', 'Junin', 'La Libertad', 'Lambayeque', 'Lima',
            'Loreto', 'Madre de Dios', 'Moquegua', 'Pasco', 'Piura',
            'Puno', 'San Martin', 'Tacna', 'Tumbes', 'Ucayali'
        ]
        
        distritos_por_region = {
            'Lima': ['Miraflores', 'San Isidro', 'Surco', 'La Molina', 'San Borja', 'Jesus Maria', 'Lince', 'Magdalena', 'Pueblo Libre', 'Barranco', 'Chorrillos', 'San Miguel'],
            'Arequipa': ['Cercado', 'Cayma', 'Yanahuara', 'Cerro Colorado', 'Paucarpata'],
            'Cusco': ['Cusco', 'Wanchaq', 'San Sebastian', 'San Jeronimo'],
            'Piura': ['Piura', 'Castilla', 'Catacaos', 'La Union'],
            'La Libertad': ['Trujillo', 'Victor Larco', 'La Esperanza', 'Huanchaco'],
        }
        
        self.stdout.write(self.style.WARNING(f'Creando {count} usuarios...'))
        
        created_users = 0
        for i in range(count):
            try:
                dni = fake.unique.random_number(digits=8, fix_len=True)
                email = f"user{i}_{fake.random_number(digits=4)}@example.com"
                
                region = random.choice(regiones)
                if region in distritos_por_region:
                    distrito = random.choice(distritos_por_region[region])
                else:
                    distrito = fake.city()
                
                user = User.objects.create_user(
                    email=email,
                    dni=str(dni),
                    first_name=fake.first_name(),
                    last_name=fake.last_name(),
                    password='password123', 
                    phone=fake.phone_number()[:15],
                    region=region,
                    distrito=distrito,
                    address=fake.street_address(),
                    gender=random.choice(['male', 'female'])
                )
                
                created_users += 1
                
                if (i + 1) % 10 == 0:
                    self.stdout.write(self.style.SUCCESS(f'Creados {i + 1}/{count} usuarios...'))
                    
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'  Error creando usuario {i + 1}: {str(e)}'))
                continue
        
        self.stdout.write(self.style.SUCCESS(f'\nSe crearon exitosamente {created_users} usuarios'))
        self.stdout.write(self.style.WARNING(f'  Contraseña para todos: password123'))
