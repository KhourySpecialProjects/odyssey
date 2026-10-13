"use client";

import { useTheme } from "next-themes";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { useEffect, useState } from "react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
);

interface WeeklyActiveUsersChartProps {
  data: { date: string; count: number }[];
}

export function WeeklyActiveUsersChart({ data }: WeeklyActiveUsersChartProps) {
  const { resolvedTheme } = useTheme();

  const [colors, setColors] = useState({
    textColor: "#000000",
    gridColor: "rgba(0,0,0,0.1)",
    tooltipBg: "#ffffff",
  });

  useEffect(() => {
    if (resolvedTheme === "dark") {
      setColors({
        textColor: "#ffffff",
        gridColor: "rgba(255,255,255,0.1)",
        tooltipBg: "#1f1f1f",
      });
    } else {
      setColors({
        textColor: "#000000",
        gridColor: "rgba(0,0,0,0.1)",
        tooltipBg: "#ffffff",
      });
    }
  }, [resolvedTheme]);

  const chartData = {
    labels: data.map((item) => new Date(item.date).toLocaleDateString()),
    datasets: [
      {
        label: "Weekly Active Users",
        data: data.map((item) => item.count),
        borderColor: "rgb(41, 116, 150)",
        tension: 0.1,
      },
    ],
  };

  const options = {
    responsive: true,
    scales: {
      x: {
        ticks: {
          color: colors.textColor,
        },
        grid: {
          color: colors.gridColor,
        },
      },
      y: {
        ticks: {
          color: colors.textColor,
        },
        grid: {
          color: colors.gridColor,
        },
      },
    },
    plugins: {
      legend: {
        labels: {
          color: colors.textColor,
        },
      },
      tooltip: {
        backgroundColor: colors.tooltipBg,
        bodyColor: colors.textColor,
        titleColor: colors.textColor,
      },
    },
  };

  return (
    <div className="flex h-[300px] w-full justify-center">
      <Line data={chartData} options={options} />
    </div>
  );
}
