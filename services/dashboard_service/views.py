from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count
from django.db.models.functions import TruncMonth
from datetime import datetime, timedelta
from denuncias_service.models import Denuncia
from denuncias_service.serializers import DenunciaListSerializer
from users_service.models import User
from users_service.permissions import IsSuperUser

class DashboardStatsView(APIView):
    permission_classes = [IsAuthenticated, IsSuperUser]
    
    def get(self, request):
        total_incidents = Denuncia.objects.count()
        total_users = User.objects.count()
        
        recent_incidents = Denuncia.objects.select_related('user').order_by('-created_at')[:5]
        recent_incidents_serializer = DenunciaListSerializer(recent_incidents, many=True, context={'request': request})

        status_stats = {
            'pending': Denuncia.objects.filter(status='Pending').count(),
            'in_progress': Denuncia.objects.filter(status='In Progress').count(),
            'resolved': Denuncia.objects.filter(status='Resolved').count()
        }
        
        type_stats = list(
            Denuncia.objects.values('_type')
            .annotate(count=Count('id'))
            .order_by('-count')[:5]
        )
        
        formatted_type_stats = [
            {
                'type': item['_type'],
                'type_display': dict(Denuncia._meta.get_field('_type').choices).get(item['_type'], item['_type']),
                'count': item['count']
            }
            for item in type_stats
        ]
        
        region_stats = list(
            Denuncia.objects.values('region')
            .annotate(count=Count('id'))
            .order_by('-count')[:5]
        )
        
        today = datetime.now()
        twelve_months_ago = today - timedelta(days=365)
        
        monthly_data = (
            Denuncia.objects
            .filter(created_at__gte=twelve_months_ago)
            .annotate(month=TruncMonth('created_at'))
            .values('month')
            .annotate(count=Count('id'))
            .order_by('month')
        )
        
        month_names = {
            1: 'Ene', 2: 'Feb', 3: 'Mar', 4: 'Abr',
            5: 'May', 6: 'Jun', 7: 'Jul', 8: 'Ago',
            9: 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Dic'
        }
        
        chart_data = []
        for item in monthly_data:
            month_num = item['month'].month
            chart_data.append({
                'x': month_names[month_num],
                'y': item['count']
            })
        
        if len(chart_data) < 12:
            all_months = {}
            for i in range(12):
                date = today - timedelta(days=30 * i)
                month_key = month_names[date.month]
                all_months[month_key] = 0
            
            for item in chart_data:
                all_months[item['x']] = item['y']
            
            chart_data = [
                {'x': month_names[((today.month - 11 + i) % 12) or 12], 'y': all_months.get(month_names[((today.month - 11 + i) % 12) or 12], 0)}
                for i in range(12)
            ]
        
        return Response({
            'total_incidents': total_incidents,
            'total_users': total_users,
            'recent_incidents': recent_incidents_serializer.data,
            'status_stats': status_stats,
            'type_stats': formatted_type_stats,
            'region_stats': region_stats,
            'chart_data': chart_data
        })


class DashboardUserStatsView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        
        total_incidents = Denuncia.objects.filter(user=user).count()
        
        recent_incidents = Denuncia.objects.filter(user=user).order_by('-created_at')[:5]
        recent_incidents_serializer = DenunciaListSerializer(recent_incidents, many=True, context={'request': request})
        
        status_stats = {
            'pending': Denuncia.objects.filter(user=user, status='Pending').count(),
            'in_progress': Denuncia.objects.filter(user=user, status='In Progress').count(),
            'resolved': Denuncia.objects.filter(user=user, status='Resolved').count()
        }
        
        today = datetime.now()
        twelve_months_ago = today - timedelta(days=365)
        
        monthly_data = (
            Denuncia.objects
            .filter(user=user, created_at__gte=twelve_months_ago)
            .annotate(month=TruncMonth('created_at'))
            .values('month')
            .annotate(count=Count('id'))
            .order_by('month')
        )
        
        month_names = {
            1: 'Ene', 2: 'Feb', 3: 'Mar', 4: 'Abr',
            5: 'May', 6: 'Jun', 7: 'Jul', 8: 'Ago',
            9: 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Dic'
        }
        
        chart_data = []
        for item in monthly_data:
            month_num = item['month'].month
            chart_data.append({
                'x': month_names[month_num],
                'y': item['count']
            })
        
        if len(chart_data) < 12:
            all_months = {}
            for i in range(12):
                date = today - timedelta(days=30 * i)
                month_key = month_names[date.month]
                all_months[month_key] = 0
            
            for item in chart_data:
                all_months[item['x']] = item['y']
            
            chart_data = [
                {'x': month_names[((today.month - 11 + i) % 12) or 12], 'y': all_months.get(month_names[((today.month - 11 + i) % 12) or 12], 0)}
                for i in range(12)
            ]
        
        return Response({
            'total_incidents': total_incidents,
            'recent_incidents': recent_incidents_serializer.data,
            'status_stats': status_stats,
            'chart_data': chart_data
        })


