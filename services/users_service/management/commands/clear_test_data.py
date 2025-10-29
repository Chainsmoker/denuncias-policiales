from django.core.management.base import BaseCommand
from denuncias_service.models import Denuncia
from users_service.models import User

class Command(BaseCommand):
    help = 'Elimina todos los usuarios de prueba y sus denuncias (excepto superusuarios)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--confirm',
            action='store_true',
            help='Confirmar la eliminación sin preguntar'
        )

    def handle(self, *args, **options):
        total_users = User.objects.filter(is_superuser=False).count()
        total_denuncias = Denuncia.objects.count()
        
        self.stdout.write(self.style.WARNING(f'\nDatos actuales:'))
        self.stdout.write(f'  Usuarios (no admin): {total_users}')
        self.stdout.write(f'  Denuncias: {total_denuncias}')
        
        if total_users == 0 and total_denuncias == 0:
            self.stdout.write(self.style.SUCCESS('\nNo hay datos para eliminar.'))
            return

        if not options['confirm']:
            self.stdout.write(self.style.WARNING('\n¿Estás seguro de eliminar todos estos datos?'))
            confirm = input('Escribe "yes" para confirmar: ')
            if confirm.lower() != 'yes':
                self.stdout.write(self.style.ERROR('Operación cancelada.'))
                return
        
        deleted_denuncias = Denuncia.objects.all().delete()[0]
        self.stdout.write(self.style.SUCCESS(f'Eliminadas {deleted_denuncias} denuncias'))
        
        deleted_users = User.objects.filter(is_superuser=False).delete()[0]
        self.stdout.write(self.style.SUCCESS(f'Eliminados {deleted_users} usuarios'))
        
        self.stdout.write(self.style.SUCCESS(f'\nBase de datos limpiada exitosamente'))
