import React, { useEffect, useMemo, useState } from 'react';
import { useTheme } from '@mui/material';
import { ResponsiveChoropleth } from '@nivo/geo';
import axios from 'axios';
import { scaleSqrt } from 'd3-scale';
import { BASE_URL } from '../utils/config';
import { geoFeatures } from '../data/mockGeoFeatures';

const GeographyChart = ({ isDashboard = false }) => {
  const theme = useTheme();
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await axios.get(
          `${BASE_URL}/reservations/report/guests-geo`,
          { withCredentials: true }
        );
        if (mounted) setPoints(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Error fetching geo points:', err?.response?.data || err?.message);
        if (mounted) setPoints([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const rScale = useMemo(() => {
    const maxV = points.reduce((m, d) => Math.max(m, Number(d?.value) || 0), 0) || 1;
    return scaleSqrt().domain([1, maxV]).range([3, 20]);
  }, [points]);

  const choroplethData = useMemo(() => {
    if (!Array.isArray(points)) return [];
    return points
      .filter(p => p && p.id)
      .map(p => ({ id: p.id, value: Number(p.value) || 0 }));
  }, [points]);

  const featuresArray = Array.isArray(geoFeatures?.features) ? geoFeatures.features : [];
  const maxValue = choroplethData.length
    ? Math.max(1, ...choroplethData.map(d => Number(d.value) || 0))
    : 1;

  // Placeholder visible mientras carga (evita no-unused-vars)
  if (loading) {
    return (
      <div
        style={{
          height: isDashboard ? 240 : 500,
          display: 'grid',
          placeItems: 'center',
          color: theme.palette.text.secondary,
        }}
        aria-busy="true"
      >
        Cargando mapa…
      </div>
    );
  }

  return (
    <ResponsiveChoropleth
      data={choroplethData}
      features={featuresArray}
      valueFormat=".0f"
      unknownColor={theme.palette.mode === 'dark' ? '#2e3440' : '#e5e7eb'}
      domain={[0, maxValue]}
      projectionScale={isDashboard ? 40 : 150}
      projectionTranslation={isDashboard ? [0.49, 0.6] : [0.5, 0.5]}
      projectionRotation={[0, 0, 0]}
      colors={[theme.palette.background.default, theme.palette.background.default]}
      borderWidth={1}
      borderColor={theme.palette.mode === 'dark' ? '#3b4252' : '#94a3b8'}
      legends={[]}
      theme={{
        tooltip: {
          container: {
            background: theme.palette.background.paper,
            color: theme.palette.text.primary,
            fontSize: 12,
          },
        },
      }}
      graticuleLineColor={theme.palette.mode === 'dark' ? '#2f3644' : '#cbd5e1'}
      layers={[
        'graticule',
        'features',
        (props) => {
          const feats = Array.isArray(props?.features) ? props.features : [];
          const path = props?.path;
          if (!feats.length || !path || !Array.isArray(points)) return null;

          const byId = new Map(feats.map(f => [f?.id, f]));
          return (
            <g>
              {points.map((p, i) => {
                if (!p?.id) return null;
                const f = byId.get(p.id);
                if (!f) return null;

                const centroid = path.centroid?.(f);
                if (!Array.isArray(centroid)) return null;

                const [cx, cy] = centroid;
                const r = rScale(Number(p.value) || 0);

                return (
                  <g key={`${p.id}-${i}`} transform={`translate(${cx}, ${cy})`}>
                    <circle
                      r={r}
                      fill={theme.palette.secondary.main}
                      fillOpacity={0.85}
                      stroke={theme.palette.background.paper}
                      strokeWidth={1.2}
                    />
                    <circle
                      r={r + 3}
                      fill={theme.palette.secondary.main}
                      fillOpacity={0.15}
                    />
                    <title>{`${p.name || p.id}: ${p.value || 0}`}</title>
                  </g>
                );
              })}
            </g>
          );
        },
      ]}
    />
  );
};

export default GeographyChart;
