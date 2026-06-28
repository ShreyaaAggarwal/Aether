import { formatCurrencyCompact, formatPercent, formatCount, formatDate } from '../../utils/formatters.js';

/**
 * columns.js
 * ----------------------------------------------------------------------
 * Single declarative source of truth for every grid column — width, field,
 * formatter, and whether it's sortable. Both the header row and the body
 * rows iterate this same array, so there is structurally no way for the
 * header and cells to drift out of alignment.
 */
export const COLUMNS = [
  { field: 'project_id', label: 'Project ID', width: 110, sortable: true, mono: true },
  { field: 'project_name', label: 'Project', width: 220, sortable: true },
  { field: 'company_id', label: 'Company', width: 100, sortable: true, mono: true },
  { field: 'project_status', label: 'Status', width: 110, sortable: true, render: 'status' },
  { field: 'automation_type', label: 'Type', width: 150, sortable: true },
  { field: 'robots_deployed', label: 'Robots', width: 80, sortable: true, align: 'right', formatter: formatCount },
  { field: 'budget_usd', label: 'Budget', width: 110, sortable: true, align: 'right', formatter: formatCurrencyCompact },
  { field: 'annual_savings_usd', label: 'Savings', width: 110, sortable: true, align: 'right', formatter: formatCurrencyCompact },
  { field: 'roi_percent', label: 'ROI', width: 90, sortable: true, align: 'right', formatter: formatPercent, render: 'roi' },
  { field: 'employee_hours_saved', label: 'Hrs Saved', width: 100, sortable: true, align: 'right', formatter: formatCount },
  { field: 'department', label: 'Department', width: 160, sortable: true },
  { field: 'implementation_partner', label: 'Partner', width: 160, sortable: true },
  { field: 'country', label: 'Country', width: 130, sortable: true },
  { field: 'industry', label: 'Industry', width: 180, sortable: true },
  { field: 'completion_date', label: 'Completed', width: 110, sortable: true, formatter: formatDate },
];

export const TOTAL_GRID_WIDTH = COLUMNS.reduce((sum, c) => sum + c.width, 0);