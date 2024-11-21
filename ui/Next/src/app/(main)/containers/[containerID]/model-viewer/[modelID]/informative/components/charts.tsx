import {
  BarChart,
  Bar,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useAppSelector } from "@/lib/store/hooks";

const timeseries = [
  {
    name: "12:00 PM",
    uv: 4000,
    pv: 2400,
    amt: 2400,
  },
  {
    name: "1:00 PM",
    uv: 3000,
    pv: 1398,
    amt: 2210,
  },
  {
    name: "2:00 PM",
    uv: 2000,
    pv: 9800,
    amt: 2290,
  },
  {
    name: "3:00 PM",
    uv: 2780,
    pv: 3908,
    amt: 2000,
  },
  {
    name: "4:00 PM",
    uv: 1890,
    pv: 4800,
    amt: 2181,
  },
  {
    name: "5:00 PM",
    uv: 2390,
    pv: 3800,
    amt: 2500,
  },
  {
    name: "6:00 PM",
    uv: 3490,
    pv: 4300,
    amt: 2100,
  },
];

const temperature = [
  {
    day: "05-01",
    temperature: [-1, 10],
  },
  {
    day: "05-02",
    temperature: [2, 15],
  },
  {
    day: "05-03",
    temperature: [3, 12],
  },
  {
    day: "05-04",
    temperature: [4, 12],
  },
  {
    day: "05-05",
    temperature: [12, 16],
  },
  {
    day: "05-06",
    temperature: [5, 16],
  },
  {
    day: "05-07",
    temperature: [3, 12],
  },
  {
    day: "05-08",
    temperature: [0, 8],
  },
  {
    day: "05-09",
    temperature: [-3, 5],
  },
];

export default function Charts() {
  const theme = useAppSelector((state) => state.theme.theme);

  return (
    <>
      <ResponsiveContainer height={"25%"}>
        <LineChart
          width={730}
          height={250}
          data={timeseries}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="pv"
            stroke={theme === "light" ? "#083769" : "#2BA8E0"}
          />
          <Line
            type="monotone"
            dataKey="uv"
            stroke={theme === "light" ? "#083769" : "#2BA8E0"}
          />
        </LineChart>
      </ResponsiveContainer>
      <ResponsiveContainer height={"25%"}>
        <BarChart
          width={730}
          height={250}
          data={temperature}
          margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
        >
          <XAxis dataKey="day" />
          <YAxis />
          <Tooltip />
          <Bar
            dataKey="temperature"
            fill={theme === "light" ? "#083769" : "#2BA8E0"}
          />
        </BarChart>
      </ResponsiveContainer>
    </>
  );
}
