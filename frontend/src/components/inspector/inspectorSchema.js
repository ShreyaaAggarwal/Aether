import { formatCurrencyFull, formatPercent, formatCount, formatDate, isNegativeRoi } from '../../utils/formatters.js';

/**
 * inspectorSchema.js
 * ----------------------------------------------------------------------
 * The bounty task asks for grouped "information architecture" rather than
 * flat key-value pairs. This module is the single mapping from raw CSV
 * fields → those semantic groups, so the Inspector component itself stays
 * purely presentational.
 */
export function buildInspectorGroups(row) {
  return [
    {
      id: 'identity',
      title: 'Mission Identity',
      icon: '◈',
      fields: [
        { label: 'Project', value: row.project_name },
        { label: 'Project ID', value: row.project_id, mono: true },
        { label: 'Company ID', value: row.company_id, mono: true },
        { label: 'Automation Type', value: row.automation_type },
        { label: 'Country', value: row.country },
        { label: 'AI-Enabled', value: row.ai_enabled },
        { label: 'Cloud Deployment', value: row.cloud_deployment },
      ],
    },
    {
      id: 'financial',
      title: 'Financial Intelligence',
      icon: '◉',
      fields: [
        { label: 'Budget', value: formatCurrencyFull(row.budget_usd) },
        { label: 'Annual Savings', value: formatCurrencyFull(row.annual_savings_usd) },
        { label: 'ROI', value: formatPercent(row.roi_percent), negative: isNegativeRoi(row.roi_percent) },
      ],
    },
    {
      id: 'operational',
      title: 'Operational Metrics',
      icon: '◎',
      fields: [
        { label: 'Robots Deployed', value: formatCount(row.robots_deployed) },
        { label: 'Employee Hours Saved', value: formatCount(row.employee_hours_saved) },
      ],
    },
    {
      id: 'risk',
      title: 'Risk Assessment',
      icon: '▲',
      fields: [
        { label: 'Status', value: row.project_status },
        { label: 'Failure Flag', value: row.project_status === 'Failed' ? 'Yes' : 'No', negative: row.project_status === 'Failed' },
        { label: 'ROI Health', value: isNegativeRoi(row.roi_percent) ? 'Negative' : 'Positive', negative: isNegativeRoi(row.roi_percent) },
      ],
    },
    {
      id: 'relationships',
      title: 'Relationships',
      icon: '⬡',
      fields: [
        { label: 'Implementation Partner', value: row.implementation_partner },
        { label: 'Industry', value: row.industry },
        { label: 'Department', value: row.department },
      ],
    },
    {
      id: 'timeline',
      title: 'Implementation Timeline',
      icon: '◷',
      fields: [
        { label: 'Start Date', value: formatDate(row.start_date) },
        { label: 'Completion Date', value: formatDate(row.completion_date) },
      ],
    },
  ];
}

/** Flat list used by the Inspector's internal search (Ctrl+F inside panel). */
export function flattenInspectorFields(row) {
  return buildInspectorGroups(row).flatMap((group) =>
    group.fields.map((f) => ({ ...f, group: group.title }))
  );
}