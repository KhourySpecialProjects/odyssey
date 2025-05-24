"use client";

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

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
);

interface NewUsersChartProps {
  data: { date: string; count: number }[];
}

export function NewUsersChart({ data }: NewUsersChartProps) {
  const chartData = {
    labels: data.map((item) => new Date(item.date).toLocaleDateString()),
    datasets: [
      {
        label: "Weekly New Users",
        data: data.map((item) => item.count),
        borderColor: "rgb(41, 116, 150)",
        tension: 0.1,
      },
    ],
  };

  return (
    <div className="flex h-[300px] w-full justify-center">
      <Line data={chartData} options={{ responsive: true }} />
    </div>
  );
}
