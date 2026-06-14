import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Radar, Scatter } from 'react-chartjs-2';
import { Recipe } from '../recipes/types';
import './ChartPanel.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ChartPanelProps {
  recipes: Recipe[];
}

const chartColors = [
  'rgba(160, 82, 45, 1)',
  'rgba(76, 175, 80, 1)',
  'rgba(33, 150, 243, 1)',
  'rgba(156, 39, 176, 1)',
  'rgba(255, 152, 0, 1)',
];

const chartBgColors = [
  'rgba(160, 82, 45, 0.2)',
  'rgba(76, 175, 80, 0.2)',
  'rgba(33, 150, 243, 0.2)',
  'rgba(156, 39, 176, 0.2)',
  'rgba(255, 152, 0, 0.2)',
];

export const ChartPanel: React.FC<ChartPanelProps> = ({ recipes }) => {
  const radarData = {
    labels: ['水温', '比例', '冲煮时间', '风味评分'],
    datasets: recipes.map((recipe, index) => ({
      label: recipe.name || recipe.beanOrigin,
      data: [
        (recipe.waterTemp / 100) * 10,
        (recipe.ratio / 20) * 10,
        (recipe.brewTime / 300) * 10,
        recipe.flavorRating,
      ],
      backgroundColor: chartBgColors[index % chartBgColors.length],
      borderColor: chartColors[index % chartColors.length],
      borderWidth: 2,
      pointBackgroundColor: chartColors[index % chartColors.length],
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      pointRadius: 4,
    })),
  };

  const radarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        beginAtZero: true,
        max: 10,
        min: 0,
        ticks: {
          stepSize: 2,
          font: {
            size: 10,
          },
        },
        pointLabels: {
          font: {
            size: 14,
            weight: 500 as const,
          },
          color: '#3d2817',
        },
        grid: {
          color: 'rgba(107, 58, 42, 0.15)',
        },
        angleLines: {
          color: 'rgba(107, 58, 42, 0.15)',
        },
      },
    },
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: '#3d2817',
          font: {
            size: 12,
          },
          usePointStyle: true,
          padding: 15,
        },
      },
      tooltip: {
        callbacks: {
          label: function (context: any) {
            const recipe = recipes[context.datasetIndex];
            const label = context.dataset.label || '';
            const valueLabel = context.label;
            let actualValue = '';
            switch (valueLabel) {
              case '水温':
                actualValue = `${recipe.waterTemp}℃`;
                break;
              case '比例':
                actualValue = `1:${recipe.ratio.toFixed(1)}`;
                break;
              case '冲煮时间':
                actualValue = `${recipe.brewTime}秒`;
                break;
              case '风味评分':
                actualValue = `${recipe.flavorRating.toFixed(1)}分`;
                break;
            }
            return `${label}: ${actualValue}`;
          },
        },
      },
    },
  };

  const scatterData = {
    datasets: recipes.map((recipe, index) => ({
      label: recipe.name || recipe.beanOrigin,
      data: [
        {
          x: recipe.brewTime,
          y: recipe.flavorRating,
        },
      ],
      backgroundColor: chartColors[index % chartColors.length],
      pointBackgroundColor: chartColors[index % chartColors.length],
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      pointRadius: 8,
      pointHoverRadius: 10,
    })),
  };

  const scatterOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: 'linear' as const,
        position: 'bottom' as const,
        title: {
          display: true,
          text: '冲煮时间（秒）',
          color: '#3d2817',
          font: {
            size: 14,
            weight: 500 as const,
          },
        },
        min: 0,
        max: 300,
        grid: {
          color: 'rgba(107, 58, 42, 0.1)',
        },
        ticks: {
          color: '#5d4037',
        },
      },
      y: {
        type: 'linear' as const,
        title: {
          display: true,
          text: '风味评分',
          color: '#3d2817',
          font: {
            size: 14,
            weight: 500 as const,
          },
        },
        min: 0,
        max: 10,
        grid: {
          color: 'rgba(107, 58, 42, 0.1)',
        },
        ticks: {
          color: '#5d4037',
        },
      },
    },
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: '#3d2817',
          font: {
            size: 12,
          },
          usePointStyle: true,
          padding: 15,
        },
      },
      tooltip: {
        callbacks: {
          label: function (context: any) {
            const recipe = recipes[context.datasetIndex];
            return [
              `${recipe.name || recipe.beanOrigin}`,
              `冲煮时间: ${recipe.brewTime}秒`,
              `风味评分: ${recipe.flavorRating.toFixed(1)}分`,
            ];
          },
        },
      },
    },
  };

  return (
    <div className="chart-panel">
      <div className="chart-container radar-chart">
        <h3 className="chart-title">参数对比雷达图</h3>
        <div className="chart-wrapper">
          {recipes.length > 0 ? (
            <Radar data={radarData} options={radarOptions} />
          ) : (
            <div className="empty-chart">请选择配方进行对比</div>
          )}
        </div>
      </div>
      <div className="chart-container scatter-chart">
        <h3 className="chart-title">时间-评分散点图</h3>
        <div className="chart-wrapper">
          {recipes.length > 0 ? (
            <Scatter data={scatterData} options={scatterOptions} />
          ) : (
            <div className="empty-chart">请选择配方进行对比</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChartPanel;
