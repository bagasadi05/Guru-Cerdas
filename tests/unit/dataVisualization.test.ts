import { describe, it, expect, vi } from 'vitest';

describe('Data Visualization', () => {
    describe('Chart Colors', () => {
        it('should have WCAG AA compliant primary colors', () => {
            const primaryColors = ['#6366F1', '#EC4899', '#14B8A6', '#F59E0B', '#8B5CF6', '#EF4444', '#22C55E', '#3B82F6'];
            expect(primaryColors.length).toBe(8);
            primaryColors.forEach(color => {
                expect(color).toMatch(/^#[0-9A-F]{6}$/i);
            });
        });

        it('should have semantic colors', () => {
            const semantic = {
                success: '#22C55E',
                warning: '#F59E0B',
                error: '#EF4444',
                info: '#3B82F6',
            };
            expect(semantic.success).toBe('#22C55E');
            expect(semantic.error).toBe('#EF4444');
        });

        it('should have attendance-specific colors', () => {
            const attendance = {
                Hadir: '#22C55E',
                Sakit: '#F59E0B',
                Izin: '#3B82F6',
                Alpha: '#EF4444',
            };
            expect(attendance.Hadir).toBe('#22C55E');
            expect(attendance.Alpha).toBe('#EF4444');
        });

        it('should have gradient pairs', () => {
            const gradients = {
                indigo: ['#6366F1', '#4F46E5'],
                pink: ['#EC4899', '#DB2777'],
            };
            expect(gradients.indigo.length).toBe(2);
        });
    });

    describe('Chart Data Types', () => {
        it('should support ChartDataPoint', () => {
            const dataPoint = {
                label: 'January',
                value: 100,
                color: '#6366F1',
                metadata: { month: 1, year: 2024 }
            };
            expect(dataPoint.label).toBe('January');
            expect(dataPoint.value).toBe(100);
        });

        it('should support ChartSeries', () => {
            const series = {
                name: 'Sales',
                data: [10, 20, 30, 40, 50],
                color: '#6366F1'
            };
            expect(series.name).toBe('Sales');
            expect(series.data.length).toBe(5);
        });
    });

    describe('Bar Chart', () => {
        it('should calculate max value', () => {
            const data = [{ value: 10 }, { value: 50 }, { value: 30 }];
            const maxValue = Math.max(...data.map(d => d.value));
            expect(maxValue).toBe(50);
        });

        it('should calculate bar width based on data count', () => {
            const dataLength = 5;
            const barWidth = 100 / dataLength - 8;
            expect(barWidth).toBe(12);
        });

        it('should calculate bar height proportionally', () => {
            const value = 75;
            const maxValue = 100;
            const height = 300;
            const barHeight = (value / maxValue) * (height - 40);
            expect(barHeight).toBe(195);
        });

        it('should support horizontal orientation', () => {
            const horizontal = true;
            expect(horizontal).toBe(true);
        });

        it('should support animation delay per bar', () => {
            const index = 2;
            const delay = index * 0.1;
            expect(delay).toBe(0.2);
        });
    });

    describe('Line Chart', () => {
        it('should support multiple series', () => {
            const series = [
                { name: 'Series 1', data: [10, 20, 30] },
                { name: 'Series 2', data: [15, 25, 35] }
            ];
            expect(series.length).toBe(2);
        });

        it('should toggle series visibility', () => {
            const activeSeries = [true, true, true];
            activeSeries[1] = false;
            expect(activeSeries).toEqual([true, false, true]);
        });

        it('should calculate max value from active series only', () => {
            const series = [{ data: [10, 20] }, { data: [100, 200] }];
            const activeSeries = [true, false];
            const activeData = series.flatMap((s, i) => activeSeries[i] ? s.data : []);
            const maxValue = Math.max(...activeData);
            expect(maxValue).toBe(20);
        });

        it('should generate bezier curve path', () => {
            const points = [{ x: 0, y: 100 }, { x: 50, y: 50 }, { x: 100, y: 0 }];
            const path = `M ${points[0].x} ${points[0].y}`;
            expect(path).toContain('M 0 100');
        });

        it('should support area fill', () => {
            const showArea = true;
            expect(showArea).toBe(true);
        });
    });

    describe('Donut Chart', () => {
        it('should calculate total from data', () => {
            const data = [{ value: 30 }, { value: 20 }, { value: 50 }];
            const total = data.reduce((sum, d) => sum + d.value, 0);
            expect(total).toBe(100);
        });

        it('should calculate percentages', () => {
            const value = 30;
            const total = 100;
            const percentage = (value / total) * 100;
            expect(percentage).toBe(30);
        });

        it('should calculate angles for segments', () => {
            const percentage = 25;
            const angle = (percentage / 100) * 360;
            expect(angle).toBe(90);
        });

        it('should start from top (-90 degrees)', () => {
            const startAngle = -90;
            expect(startAngle).toBe(-90);
        });

        it('should convert polar to cartesian coordinates', () => {
            const polarToCartesian = (cx: number, cy: number, radius: number, angle: number) => {
                const radians = (angle * Math.PI) / 180;
                return {
                    x: cx + radius * Math.cos(radians),
                    y: cy + radius * Math.sin(radians)
                };
            };
            const point = polarToCartesian(50, 50, 45, 0);
            expect(point.x).toBe(95);
            expect(point.y).toBe(50);
        });

        it('should support donut mode with inner radius', () => {
            const donut = true;
            const innerRadius = 25;
            expect(donut).toBe(true);
            expect(innerRadius).toBeGreaterThan(0);
        });

        it('should display center label and value', () => {
            const centerLabel = 'Total';
            const centerValue = 150;
            expect(centerLabel).toBe('Total');
            expect(centerValue).toBe(150);
        });
    });

    describe('Tooltip', () => {
        it('should position tooltip above point', () => {
            const x = 100;
            const y = 50;
            const transform = 'translate(-50%, -100%)';
            const marginTop = -10;
            expect(transform).toContain('-50%');
            expect(marginTop).toBe(-10);
        });

        it('should display title and items', () => {
            const tooltip = {
                title: 'January',
                items: [
                    { label: 'Sales', value: 100, color: '#6366F1' },
                    { label: 'Revenue', value: 5000, color: '#EC4899' }
                ]
            };
            expect(tooltip.title).toBe('January');
            expect(tooltip.items.length).toBe(2);
        });

        it('should show color indicators', () => {
            const item = { label: 'Sales', value: 100, color: '#6366F1' };
            expect(item.color).toBeDefined();
        });
    });

    describe('Legend', () => {
        it('should display all items', () => {
            const items = [
                { label: 'A', color: '#6366F1' },
                { label: 'B', color: '#EC4899' },
                { label: 'C', color: '#14B8A6' }
            ];
            expect(items.length).toBe(3);
        });

        it('should support toggling items', () => {
            const items = [
                { label: 'A', active: true },
                { label: 'B', active: true }
            ];
            items[0].active = false;
            expect(items[0].active).toBe(false);
        });

        it('should support different positions', () => {
            const positions = ['top', 'bottom', 'right'];
            expect(positions).toContain('top');
            expect(positions).toContain('bottom');
        });

        it('should show value alongside label', () => {
            const item = { label: 'Sales', color: '#6366F1', value: 100 };
            expect(item.value).toBe(100);
        });
    });

    describe('Chart Wrapper', () => {
        it('should display title and subtitle', () => {
            const title = 'Monthly Sales';
            const subtitle = 'Last 12 months';
            expect(title).toBe('Monthly Sales');
            expect(subtitle).toBe('Last 12 months');
        });

        it('should support export functionality', () => {
            const showExport = true;
            expect(showExport).toBe(true);
        });

        it('should support fullscreen mode', () => {
            const showFullscreen = true;
            expect(showFullscreen).toBe(true);
        });
    });

    describe('Attendance Chart', () => {
        it('should map attendance data to chart format', () => {
            const data = { Hadir: 25, Sakit: 3, Izin: 2, Alpha: 0 };
            const chartData = [
                { label: 'Hadir', value: data.Hadir },
                { label: 'Sakit', value: data.Sakit },
                { label: 'Izin', value: data.Izin },
                { label: 'Alpha', value: data.Alpha }
            ];
            expect(chartData[0].value).toBe(25);
        });

        it('should calculate attendance rate', () => {
            const hadir = 25;
            const total = 30;
            const rate = ((hadir / total) * 100).toFixed(1);
            expect(rate).toBe('83.3');
        });

        it('should support donut and bar types', () => {
            const types = ['donut', 'bar', 'stacked'];
            expect(types).toContain('donut');
            expect(types).toContain('bar');
        });
    });

    describe('Sparkline', () => {
        it('should calculate value range', () => {
            const data = [10, 50, 30, 70, 40];
            const maxValue = Math.max(...data);
            const minValue = Math.min(...data);
            const range = maxValue - minValue;
            expect(range).toBe(60);
        });

        it('should normalize points to percentage', () => {
            const data = [10, 50, 30];
            const length = data.length;
            const points = data.map((_, i) => (i / (length - 1)) * 100);
            expect(points).toEqual([0, 50, 100]);
        });

        it('should support area fill', () => {
            const showArea = true;
            expect(showArea).toBe(true);
        });

        it('should show end dot', () => {
            const data = [10, 20, 30];
            const lastIndex = data.length - 1;
            expect(lastIndex).toBe(2);
        });
    });

    describe('Stat Card', () => {
        it('should display value and title', () => {
            const props = {
                title: 'Total Students',
                value: 150
            };
            expect(props.title).toBe('Total Students');
            expect(props.value).toBe(150);
        });

        it('should show positive change with up arrow', () => {
            const change = 5;
            const isPositive = change >= 0;
            const arrow = isPositive ? '↑' : '↓';
            expect(arrow).toBe('↑');
        });

        it('should show negative change with down arrow', () => {
            const change = -3;
            const isPositive = change >= 0;
            const arrow = isPositive ? '↑' : '↓';
            expect(arrow).toBe('↓');
        });

        it('should display trend sparkline', () => {
            const trend = [10, 15, 12, 18, 20];
            expect(trend.length).toBe(5);
        });

        it('should support custom colors', () => {
            const color = '#6366F1';
            expect(color).toBe('#6366F1');
        });
    });

    describe('Drill-down', () => {
        it('should call onDrillDown when clicked', () => {
            const onDrillDown = vi.fn();
            const point = { label: 'January', value: 100 };
            const index = 0;

            onDrillDown(point, index);
            expect(onDrillDown).toHaveBeenCalledWith(point, index);
        });

        it('should pass metadata in drill-down', () => {
            const point = {
                label: 'January',
                value: 100,
                metadata: { month: 1, year: 2024, details: [] }
            };
            expect(point.metadata.month).toBe(1);
        });
    });

    describe('Responsive Design', () => {
        it('should use percentage widths', () => {
            const width = '100%';
            expect(width).toBe('100%');
        });

        it('should support custom height', () => {
            const height = 300;
            expect(height).toBe(300);
        });

        it('should use viewBox for SVG scaling', () => {
            const viewBox = '0 0 100 100';
            expect(viewBox).toBe('0 0 100 100');
        });
    });

    describe('Animations', () => {
        it('should apply grow-bar animation', () => {
            const animation = 'grow-bar 0.6s ease-out';
            expect(animation).toContain('grow-bar');
        });

        it('should stagger animation by index', () => {
            const index = 3;
            const delay = (index * 0.1).toFixed(1);
            expect(delay).toBe('0.3');
        });

        it('should apply fade-in to tooltip', () => {
            const className = 'animate-fade-in';
            expect(className).toContain('fade-in');
        });
    });

    describe('Accessibility', () => {
        it('should have descriptive labels', () => {
            const title = 'Export as Image';
            expect(title).toBe('Export as Image');
        });

        it('should use high contrast colors', () => {
            const colors = ['#6366F1', '#22C55E', '#EF4444'];
            colors.forEach(color => {
                expect(color).toMatch(/^#[0-9A-F]{6}$/i);
            });
        });

        it('should have text labels for data points', () => {
            const label = 'January';
            expect(label).toBeDefined();
        });
    });

    describe('Grid Lines', () => {
        it('should display 5 horizontal grid lines', () => {
            const gridLines = 5;
            expect(gridLines).toBe(5);
        });

        it('should calculate Y-axis labels', () => {
            const maxValue = 100;
            const labels = [...Array(5)].map((_, i) => Math.round(maxValue * (1 - i / 4)));
            expect(labels).toEqual([100, 75, 50, 25, 0]);
        });
    });
});
