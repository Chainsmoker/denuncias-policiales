import ApiClient from './client.js';

import { endpoints } from './variables.js'

class Dashboard extends ApiClient {
    constructor() {
        super();
        this.data = {
            total_users: 0,
            total_denuncias: 0,
            total_resueltas: 0,
            total_pendientes: 0,
            chart_data: []
        };
    }

    async init() {
        await this.getDashboardStats();
    }

    async getDashboardStats() {
        try {
            const endpoint = Alpine.store('currentUser').is_superuser ? endpoints.reports : endpoints.myReports;
            const { success, data } = await this.get(endpoint);
            if (success) {
                this.data = data;
                console.log(data);
                this.renderChart();
            } else {
                this.error = 'Failed to load dashboard statistics.';
            }
        } catch (error) {
            console.error('Error fetching dashboard statistics:', error);
        }
    }

    renderChart() {
        const denunciasChart = document.getElementById('total_denuncias_chart');
        if (denunciasChart) {
            denunciasChart.innerHTML = '';

            const categories = this.data.chart_data.map(item => item.x);
            const values = this.data.chart_data.map(item => item.y);
            
            var options = {
                series: [
                    {
                        name: "Denuncias",
                        data: values
                    }
                ],
                chart: {
                    height: 282,
                    type: "line",
                    animations: {
                        enabled: true,
                        speed: 500
                    },
                    toolbar: {
                        show: false
                    },
                    zoom: {
                        enabled: false
                    }
                },
                colors: [
                    "#796df6"
                ],
                dataLabels: {
                    enabled: false
                },
                stroke: {
                    curve: "smooth",
                    width: 3
                },
                xaxis: {
                    categories: categories,
                    axisBorder: {
                        show: false,
                        color: '#e0e0e0'
                    },
                    axisTicks: {
                        show: true,
                        color: '#e0e0e0'
                    },
                    labels: {
                        style: {
                            colors: "#919aa3",
                            fontSize: "14px",
                            fontFamily: 'Outfit',
                        }
                    }
                },
                yaxis: {
                    tickAmount: 5,
                    min: 0,
                    labels: {
                        style: {
                            colors: "#919aa3",
                            fontSize: "14px",
                            fontFamily: 'Outfit',
                        },
                        formatter: function(value) {
                            return Math.floor(value);
                        }
                    }
                },
                legend: {
                    show: false
                },
                markers: {
                    size: 5,
                    colors: ["#796df6"],
                    strokeColors: "#fff",
                    strokeWidth: 2,
                    hover: {
                        size: 7
                    }
                },
                grid: {
                    strokeDashArray: 5,
                    borderColor: "#e0e0e0",
                    row: {
                        colors: ['transparent', 'transparent'],
                        opacity: 0.5
                    }
                },
                tooltip: {
                    enabled: true,
                    theme: 'light',
                    y: {
                        formatter: function(value) {
                            return value + " denuncias";
                        }
                    }
                }
            };

            var chart = new ApexCharts(document.querySelector("#total_denuncias_chart"), options);
            chart.render();
        }
    }

    getStatusBadgeClass(status) {
        const classes = {
            'Pending': 'text-warning bg-warning',
            'In Progress': 'text-primary bg-primary',
            'Resolved': 'text-success bg-success'
        };
        return classes[status] || 'text-secondary bg-secondary';
    }

    getStatusText(status) {
        const texts = {
            'Pending': 'Pendiente',
            'In Progress': 'En Progreso',
            'Resolved': 'Resuelto'
        };
        return texts[status] || status;
    }

    getTypeText(type) {
        const types = {
            'accident': 'Accidente de tránsito',
            'theft': 'Robo o hurto',
            'assault': 'Agresión o violencia física',
            'domestic_violence': 'Violencia familiar o de pareja',
            'fraud': 'Estafa o fraude',
            'missing_person': 'Persona desaparecida',
            'vandalism': 'Vandalismo o daños a la propiedad',
            'drug_trafficking': 'Tráfico o consumo de drogas',
            'homicide': 'Homicidio o intento de homicidio',
            'harassment': 'Acoso o amenazas',
            'cybercrime': 'Delito informático',
            'sexual_abuse': 'Abuso o acoso sexual',
            'weapon_possession': 'Tenencia ilegal de armas',
            'public_disturbance': 'Alteración del orden público',
            'child_abuse': 'Maltrato infantil',
            'animal_abuse': 'Maltrato animal',
            'property_dispute': 'Conflicto por propiedad',
            'corruption': 'Corrupción o soborno',
            'kidnapping': 'Secuestro o tentativa',
            'other': 'Otro tipo de denuncia'
        };
        return types[type] || type;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    }
}

document.addEventListener('alpine:init', () => {
    Alpine.data('dashboard', () => new Dashboard());
});