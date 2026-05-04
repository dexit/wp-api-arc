import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ProjectState } from '../types';

interface StatsChartProps {
  project: ProjectState;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export const StatsChart: React.FC<StatsChartProps> = ({ project }) => {
  const complexityData = [
    ...project.postTypes.map(pt => ({
      name: pt.singularName,
      Type: 'Post Type',
      Items: pt.metaFields.length,
    })),
    ...project.customEndpoints.map(ep => ({
      name: ep.route,
      Type: 'Endpoint',
      Items: ep.parameters.length,
    }))
  ];

  const typeDistribution = {
    'Post Types': project.postTypes.length,
    'Taxonomies': project.taxonomies.length,
    'Endpoints': project.customEndpoints.length
  };

  const pieData = Object.keys(typeDistribution).map((key) => ({
    name: key,
    value: typeDistribution[key as keyof typeof typeDistribution]
  }));

  return (
    <div className="h-full w-full p-6 overflow-y-auto">
      <h2 className="text-2xl font-bold mb-6 text-white">Project Outline & Stats</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-slate-800 p-4 rounded-xl shadow-lg border border-slate-700">
          <h3 className="text-lg font-semibold mb-4 text-slate-300">Project Composition</h3>
          <div className="h-64">
             <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name} (${value})`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                   contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', color: '#F3F4F6' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-800 p-4 rounded-xl shadow-lg border border-slate-700">
          <h3 className="text-lg font-semibold mb-4 text-slate-300">Field/Param Complexity</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={complexityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9CA3AF" tick={{fontSize: 10}} interval={0} />
                <YAxis stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', color: '#F3F4F6' }}
                />
                <Legend />
                <Bar dataKey="Items" name="Fields/Params" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-700 lg:col-span-2">
            <h3 className="text-lg font-semibold mb-4 text-slate-300">Detailed Plan</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h4 className="text-indigo-400 font-medium mb-2 border-b border-indigo-500/30 pb-1">Resources (Content)</h4>
                    <ul className="space-y-2 text-sm text-slate-400">
                        {project.postTypes.map(pt => (
                            <li key={pt.id} className="flex justify-between">
                                <span>{pt.pluralName}</span>
                                <span className="text-slate-600 font-mono">/wp/v2/{pt.restBase}</span>
                            </li>
                        ))}
                    </ul>
                </div>
                <div>
                    <h4 className="text-pink-400 font-medium mb-2 border-b border-pink-500/30 pb-1">Endpoints (Actions)</h4>
                     <ul className="space-y-2 text-sm text-slate-400">
                        {project.customEndpoints.map(ep => (
                            <li key={ep.id} className="flex flex-col">
                                <div className="flex justify-between items-center">
                                    <span className="font-mono text-slate-300">{ep.method} /{project.namespace}{ep.route}</span>
                                    <span className="text-xs bg-slate-700 px-2 py-0.5 rounded">{ep.hookName || 'No hook'}</span>
                                </div>
                                <span className="text-xs text-slate-600">{ep.callbackFunction}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};
