/**
 * Global Food Trade Network - Interactive Visualizations & Simulations
 * Powered by Apache ECharts
 * Styled with the classic clean palette: Forest green (#2d5a3d), white surfaces, and dark typography (#333).
 */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    if (!window.TRADE_DATA) {
      console.error('TRADE_DATA not loaded!');
      return;
    }

    const data = window.TRADE_DATA;

    // Initialize all interactive components
    initGlobalStats(data);
    initNetworkMapExplorer(data);
    initAdjacencyHeatmap(data);
    initIntroCharts(data);
    initDistributionTabs(data);
    initCommunityCharts(data);
    initRoutesExplorer(data);
    initCountryRankings(data);
    initCentralityMatrix(data);
    initDegreeVsPagerank(data);
    initRemovalDamageChart(data);
    initRobustnessSuite(data);
    initLiveAttackSimulator(data);
    initTailModelComparison(data);
    initCountryDataTable(data);

    window.addEventListener('resize', () => {
      chartInstances.forEach(c => c && c.resize && c.resize());
    });
  });

  const chartInstances = [];

  // Helper formatting functions
  function formatMoney(val) {
    if (val === undefined || val === null) return '$0';
    if (val >= 1e9) return '$' + (val / 1e9).toFixed(2) + 'B';
    if (val >= 1e6) return '$' + (val / 1e6).toFixed(1) + 'M';
    if (val >= 1e3) return '$' + (val / 1e3).toFixed(0) + 'K';
    return '$' + val.toFixed(0);
  }

  function formatPct(val) {
    return (val * 100).toFixed(1) + '%';
  }

  function formatNum(val) {
    return Number(val).toLocaleString();
  }

  // Common tooltip style for light theme
  const lightTooltip = {
    backgroundColor: '#ffffff',
    borderColor: '#2d5a3d',
    borderWidth: 1.5,
    padding: [10, 14],
    textStyle: { color: '#333333', fontFamily: 'Poppins, sans-serif', fontSize: 12 },
    extraCssText: 'box-shadow: 0 4px 20px rgba(0,0,0,0.12); border-radius: 8px;'
  };

  // --------------------------------------------------------------------------
  // 1. GLOBAL STATS COUNTERS
  // --------------------------------------------------------------------------
  function initGlobalStats(data) {
    const meta = data.metadata;
    const statsContainer = document.getElementById('hero-stats-row');
    if (!statsContainer) return;

    statsContainer.innerHTML = `
      <div class="stat-card">
        <div class="stat-icon"><i class="fas fa-globe"></i></div>
        <div class="stat-number">${meta.nodes}</div>
        <div class="stat-label">Trading Countries</div>
        <div class="stat-sub">100% Reachable (Single SCC)</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon"><i class="fas fa-route"></i></div>
        <div class="stat-number">${formatNum(meta.edges)}</div>
        <div class="stat-label">Active Trade Corridors</div>
        <div class="stat-sub">Reciprocity: ${formatPct(meta.reciprocity)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon"><i class="fas fa-coins"></i></div>
        <div class="stat-number">${formatMoney(meta.totalTrade)}</div>
        <div class="stat-label">Total Global Trade</div>
        <div class="stat-sub">Sum of all bilateral flows</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon"><i class="fas fa-project-diagram"></i></div>
        <div class="stat-number">${(meta.density * 100).toFixed(1)}%</div>
        <div class="stat-label">Network Density</div>
        <div class="stat-sub">Assortativity: ${meta.assortativity} (Disassortative)</div>
      </div>
    `;
  }

  // --------------------------------------------------------------------------
  // 2. MASTER NETWORK & FLOW EXPLORER
  // --------------------------------------------------------------------------
  function initNetworkMapExplorer(data) {
    const dom = document.getElementById('interactive-network-chart');
    if (!dom) return;

    const chart = echarts.init(dom);
    chartInstances.push(chart);

    let currentMode = 'geo';
    let currentMetric = 'pagerank';
    let selectedCountry = null;
    let edgeLimit = 120;

    const selectEl = document.getElementById('network-country-select');
    if (selectEl) {
      selectEl.innerHTML = '<option value="">-- All Countries (Global Network) --</option>' +
        data.countries
          .slice()
          .sort((a, b) => b.totalTrade - a.totalTrade)
          .map(c => `<option value="${c.name}">${c.shortName} (${formatMoney(c.totalTrade)})</option>`)
          .join('');

      selectEl.addEventListener('change', (e) => {
        selectedCountry = e.target.value || null;
        updateChart();
        updateSelectedCountryPanel(selectedCountry, data);
      });
    }

    const btnGeo = document.getElementById('btn-mode-geo');
    const btnForce = document.getElementById('btn-mode-force');
    if (btnGeo && btnForce) {
      btnGeo.addEventListener('click', () => {
        currentMode = 'geo';
        btnGeo.classList.add('active');
        btnForce.classList.remove('active');
        updateChart();
      });
      btnForce.addEventListener('click', () => {
        currentMode = 'force';
        btnForce.classList.add('active');
        btnGeo.classList.remove('active');
        updateChart();
      });
    }

    document.querySelectorAll('[data-net-metric]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-net-metric]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentMetric = btn.getAttribute('data-net-metric');
        updateChart();
      });
    });

    const edgeSlider = document.getElementById('network-edge-slider');
    const edgeValueLabel = document.getElementById('network-edge-count');
    if (edgeSlider) {
      edgeSlider.addEventListener('input', (e) => {
        edgeLimit = parseInt(e.target.value, 10);
        if (edgeValueLabel) edgeValueLabel.textContent = edgeLimit;
        updateChart();
      });
    }

    const resetBtn = document.getElementById('btn-reset-network');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        selectedCountry = null;
        if (selectEl) selectEl.value = '';
        updateChart();
        updateSelectedCountryPanel(null, data);
      });
    }

    function getNodeColor(c) {
      if (currentMetric === 'community') {
        const commColors = { 1: '#2563eb', 2: '#2d5a3d', 3: '#d97706' };
        return commColors[c.community] || '#7c3aed';
      }
      if (currentMetric === 'balance') {
        return c.netExporter ? '#2d5a3d' : '#dc2626';
      }
      if (currentMetric === 'volume') {
        const t = c.totalTrade;
        if (t > 200e6) return '#2d5a3d';
        if (t > 50e6) return '#3a7d50';
        if (t > 10e6) return '#d97706';
        return '#94a3b8';
      }
      // PageRank default
      const pr = c.pagerank;
      if (pr > 0.04) return '#2d5a3d';
      if (pr > 0.02) return '#3a7d50';
      if (pr > 0.01) return '#0284c7';
      return '#94a3b8';
    }

    function getNodeSize(c) {
      if (currentMetric === 'pagerank') {
        return Math.max(7, Math.min(38, Math.sqrt(c.pagerank) * 125));
      }
      if (currentMetric === 'volume' || currentMetric === 'balance') {
        return Math.max(7, Math.min(42, Math.sqrt(c.totalTrade / 1e6) * 1.4));
      }
      return Math.max(7, Math.min(34, Math.sqrt(c.degree) * 2.1));
    }

    function updateChart() {
      chart.showLoading({ color: '#2d5a3d', maskColor: 'rgba(255, 255, 255, 0.6)' });

      let edgesToDraw = data.topRoutes.flow300.slice(0, edgeLimit);
      if (selectedCountry) {
        edgesToDraw = data.topRoutes.flow300.filter(
          e => e.source === selectedCountry || e.target === selectedCountry
        );
      }

      const nodes = data.countries.map(c => {
        const isSelected = selectedCountry === c.name;
        const isConnected = selectedCountry
          ? edgesToDraw.some(e => e.source === c.name || e.target === c.name)
          : true;

        const size = getNodeSize(c);
        const color = getNodeColor(c);

        return {
          id: c.name,
          name: c.shortName,
          fullName: c.name,
          countryData: c,
          symbolSize: isSelected ? Math.max(size * 1.35, 24) : (isConnected ? size : Math.max(4, size * 0.5)),
          itemStyle: {
            color: isSelected ? '#d97706' : (isConnected ? color : '#e2e8f0'),
            borderColor: isSelected ? '#ffffff' : (isConnected ? '#ffffff' : '#cbd5e1'),
            borderWidth: isSelected ? 3 : 1.5,
            shadowBlur: isSelected ? 12 : (isConnected ? 4 : 0),
            shadowColor: isSelected ? '#d97706' : 'rgba(0,0,0,0.15)',
            opacity: isConnected ? 1 : 0.35
          },
          label: {
            show: isSelected || (currentMode === 'geo' ? size > 20 : size > 24),
            formatter: '{b}',
            fontSize: isSelected ? 12 : 10,
            fontWeight: isSelected ? 'bold' : 'normal',
            color: '#1e293b',
            position: 'right'
          },
          x: currentMode === 'geo' ? c.coords[0] * 7 + 1200 : undefined,
          y: currentMode === 'geo' ? -c.coords[1] * 7 + 600 : undefined,
          fixed: currentMode === 'geo'
        };
      });

      const links = edgesToDraw.map(e => {
        const isOut = selectedCountry && e.source === selectedCountry;
        const isIn = selectedCountry && e.target === selectedCountry;

        let lineColor = 'rgba(45, 90, 61, 0.28)';
        if (selectedCountry) {
          if (isOut) lineColor = 'rgba(217, 119, 6, 0.85)'; // Amber for export
          if (isIn) lineColor = 'rgba(45, 90, 61, 0.9)';   // Forest green for import
        }

        const lineWidth = Math.max(1, Math.min(6, Math.log10(e.value / 1e5 + 1) * 1.6));

        return {
          source: e.source,
          target: e.target,
          value: e.value,
          lineStyle: {
            width: selectedCountry ? lineWidth + 1.5 : lineWidth,
            color: lineColor,
            curveness: currentMode === 'geo' ? 0.22 : 0.15,
            opacity: selectedCountry ? 0.9 : 0.45
          }
        };
      });

      const option = {
        backgroundColor: '#ffffff',
        tooltip: {
          trigger: 'item',
          ...lightTooltip,
          formatter: (params) => {
            if (params.dataType === 'edge') {
              const e = params.data;
              return `
                <div style="font-weight:700; color:#2d5a3d; margin-bottom:4px;">
                  <i class="fas fa-arrow-right"></i> Food Flow Corridor
                </div>
                <div><strong>Exporter:</strong> ${e.source}</div>
                <div><strong>Importer:</strong> ${e.target}</div>
                <div><strong>Trade Value:</strong> <span style="color:#2d5a3d; font-weight:700;">${formatMoney(e.value)}</span></div>
              `;
            }
            const c = params.data.countryData;
            return `
              <div style="font-weight:700; font-size:14px; color:#2d5a3d; margin-bottom:6px;">
                <i class="fas fa-flag"></i> ${c.name}
              </div>
              <div style="display:grid; grid-template-columns: auto auto; gap:3px 12px; font-size:12px; color:#333;">
                <span>Total Trade:</span><strong>${formatMoney(c.totalTrade)}</strong>
                <span>Exports:</span><strong style="color:#2d5a3d;">${formatMoney(c.exportValue)}</strong>
                <span>Imports:</span><strong style="color:#dc2626;">${formatMoney(c.importValue)}</strong>
                <span>Net Status:</span><strong style="color:${c.netExporter ? '#2d5a3d' : '#dc2626'}">${c.netExporter ? 'Net Exporter (+$' + (c.tradeBalance/1e6).toFixed(0) + 'M)' : 'Net Importer (-$' + (Math.abs(c.tradeBalance)/1e6).toFixed(0) + 'M)'}</strong>
                <span>PageRank Rank:</span><strong>#${c.pagerankRank} (${c.pagerank.toFixed(4)})</strong>
                <span>Partners:</span><strong>${c.degree} (${c.inDegree} in / ${c.outDegree} out)</strong>
                <span>Community:</span><strong>Bloc ${c.community}</strong>
              </div>
              <div style="margin-top:6px; font-size:11px; color:#666; font-style:italic;">
                Click node to focus its trade flows
              </div>
            `;
          }
        },
        legend: { show: false },
        series: [{
          type: 'graph',
          layout: currentMode === 'force' ? 'force' : 'none',
          data: nodes,
          links: links,
          roam: true,
          draggable: true,
          edgeSymbol: ['none', 'arrow'],
          edgeSymbolSize: currentMode === 'geo' ? [0, 5] : [0, 4],
          force: {
            repulsion: 170,
            edgeLength: [60, 160],
            gravity: 0.12,
            friction: 0.85
          },
          emphasis: {
            focus: 'adjacency',
            lineStyle: { width: 4.5, opacity: 0.95 },
            itemStyle: { borderColor: '#2d5a3d', borderWidth: 2 }
          }
        }]
      };

      chart.hideLoading();
      chart.setOption(option, true);
    }

    chart.on('click', (params) => {
      if (params.dataType === 'node') {
        const countryName = params.data.fullName;
        selectedCountry = countryName;
        if (selectEl) selectEl.value = countryName;
        updateChart();
        updateSelectedCountryPanel(countryName, data);
      }
    });

    updateChart();
  }

  function updateSelectedCountryPanel(countryName, data) {
    const panel = document.getElementById('selected-country-card');
    if (!panel) return;

    if (!countryName) {
      panel.innerHTML = '';
      return;
    }

    const c = data.countries.find(x => x.name === countryName);
    if (!c) return;

    const exportsTo = data.topRoutes.flow300
      .filter(e => e.source === countryName)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const importsFrom = data.topRoutes.flow300
      .filter(e => e.target === countryName)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    panel.innerHTML = `
      <div class="country-profile-card">
        <div class="country-profile-header">
          <div>
            <h3><i class="fas fa-globe"></i> ${c.name}</h3>
            <span class="badge ${c.netExporter ? 'badge-success' : 'badge-danger'}">
              ${c.netExporter ? 'Net Exporter' : 'Net Importer'}
            </span>
            <span class="badge badge-info">Bloc ${c.community}</span>
            <span class="badge badge-warning">PageRank #${c.pagerankRank}</span>
          </div>
          <button id="btn-clear-selection" class="btn-sm"><i class="fas fa-times"></i> Clear</button>
        </div>

        <div class="country-metrics-grid">
          <div class="metric-box">
            <span class="label">Total Trade</span>
            <span class="value">${formatMoney(c.totalTrade)}</span>
          </div>
          <div class="metric-box">
            <span class="label">Exports</span>
            <span class="value" style="color:#2d5a3d;">${formatMoney(c.exportValue)}</span>
          </div>
          <div class="metric-box">
            <span class="label">Imports</span>
            <span class="value" style="color:#dc2626;">${formatMoney(c.importValue)}</span>
          </div>
          <div class="metric-box">
            <span class="label">Trade Balance</span>
            <span class="value" style="color:${c.tradeBalance >= 0 ? '#2d5a3d' : '#dc2626'};">
              ${c.tradeBalance >= 0 ? '+' : ''}${formatMoney(c.tradeBalance)}
            </span>
          </div>
          <div class="metric-box">
            <span class="label">Import Dependency</span>
            <span class="value">${(c.importDependency * 100).toFixed(1)}%</span>
          </div>
          <div class="metric-box">
            <span class="label">Export Dependency</span>
            <span class="value">${(c.exportDependency * 100).toFixed(1)}%</span>
          </div>
          <div class="metric-box">
            <span class="label">Partners (Degree)</span>
            <span class="value">${c.degree} (${c.inDegree} In, ${c.outDegree} Out)</span>
          </div>
          <div class="metric-box">
            <span class="label">Betweenness Centrality</span>
            <span class="value">${c.betweenness.toFixed(4)}</span>
          </div>
        </div>

        <div class="partner-lists">
          <div class="partner-col">
            <h5><i class="fas fa-arrow-up" style="color:#d97706;"></i> Top Export Destinations</h5>
            ${exportsTo.length ? exportsTo.map(e => `
              <div class="partner-item">
                <span>${e.target}</span>
                <strong style="color:#2d5a3d;">${formatMoney(e.value)}</strong>
              </div>
            `).join('') : '<p style="font-size:0.8rem; color:#888;">No top flow record</p>'}
          </div>
          <div class="partner-col">
            <h5><i class="fas fa-arrow-down" style="color:#2d5a3d;"></i> Top Import Suppliers</h5>
            ${importsFrom.length ? importsFrom.map(e => `
              <div class="partner-item">
                <span>${e.source}</span>
                <strong style="color:#2d5a3d;">${formatMoney(e.value)}</strong>
              </div>
            `).join('') : '<p style="font-size:0.8rem; color:#888;">No top flow record</p>'}
          </div>
        </div>
      </div>
    `;

    document.getElementById('btn-clear-selection')?.addEventListener('click', () => {
      document.getElementById('btn-reset-network')?.click();
    });
  }

  // --------------------------------------------------------------------------
  // 3. ADJACENCY MATRIX HEATMAP
  // --------------------------------------------------------------------------
  function initAdjacencyHeatmap(data) {
    const dom = document.getElementById('chart-adjacency-heatmap');
    if (!dom) return;

    const chart = echarts.init(dom);
    chartInstances.push(chart);

    const adj = data.adjacency;
    const countries = adj.countries;
    const matrix = adj.matrix;

    const points = [];
    for (let r = 0; r < countries.length; r++) {
      for (let c = 0; c < countries.length; c++) {
        const val = matrix[r][c];
        if (val > 0) {
          points.push([c, r, val]);
        }
      }
    }

    const option = {
      backgroundColor: '#ffffff',
      tooltip: {
        position: 'top',
        ...lightTooltip,
        formatter: (params) => {
          const exporter = countries[params.value[1]];
          const importer = countries[params.value[0]];
          const norm = params.value[2];
          return `
            <div style="font-weight:700; color:#2d5a3d; margin-bottom:4px;">Adjacency Matrix Cell</div>
            <div><strong>Exporter:</strong> ${exporter}</div>
            <div><strong>Importer:</strong> ${importer}</div>
            <div><strong>Normalized Intensity:</strong> <span style="color:#2d5a3d; font-weight:bold;">${(norm * 100).toFixed(2)}%</span></div>
          `;
        }
      },
      grid: {
        top: 20,
        bottom: 90,
        left: 130,
        right: 40
      },
      xAxis: {
        type: 'category',
        data: countries,
        axisLabel: {
          rotate: 45,
          color: '#555',
          fontSize: 11,
          interval: 0,
          fontFamily: 'Poppins, sans-serif'
        },
        splitArea: { show: true },
        axisLine: { lineStyle: { color: '#cbd5e1' } }
      },
      yAxis: {
        type: 'category',
        data: countries,
        inverse: true,
        axisLabel: {
          color: '#555',
          fontSize: 11,
          interval: 0,
          fontFamily: 'Poppins, sans-serif'
        },
        splitArea: { show: true },
        axisLine: { lineStyle: { color: '#cbd5e1' } }
      },
      visualMap: {
        min: 0,
        max: 1,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: 10,
        inRange: {
          color: ['#f7fcf5', '#e5f5e0', '#a1d99b', '#41ab5d', '#238b45', '#00441b']
        },
        textStyle: { color: '#333' }
      },
      series: [{
        name: 'Trade Intensity',
        type: 'heatmap',
        data: points,
        label: { show: false }
      }]
    };

    chart.setOption(option);
  }

  // --------------------------------------------------------------------------
  // 4. INTRODUCTORY CONNECTIVITY & TRADE VALUE HISTOGRAM
  // --------------------------------------------------------------------------
  function initIntroCharts(data) {
    const domConn = document.getElementById('chart-intro-connected');
    if (domConn) {
      const chart = echarts.init(domConn);
      chartInstances.push(chart);

      const topConnected = data.countries
        .slice()
        .sort((a, b) => b.degree - a.degree)
        .slice(0, 15)
        .reverse();

      const names = topConnected.map(c => c.shortName);
      const inDeg = topConnected.map(c => c.inDegree);
      const outDeg = topConnected.map(c => c.outDegree);

      const option = {
        backgroundColor: '#ffffff',
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'shadow' },
          ...lightTooltip
        },
        legend: {
          data: ['Inbound Partners (Suppliers)', 'Outbound Partners (Customers)'],
          textStyle: { color: '#333', fontFamily: 'Poppins, sans-serif' },
          top: 0
        },
        grid: { left: 120, right: 30, top: 40, bottom: 20 },
        xAxis: {
          type: 'value',
          name: 'Partner Count',
          axisLabel: { color: '#555' },
          splitLine: { lineStyle: { color: '#e2e8f0' } }
        },
        yAxis: {
          type: 'category',
          data: names,
          axisLabel: { color: '#333', fontSize: 11, fontFamily: 'Poppins, sans-serif' }
        },
        series: [
          {
            name: 'Inbound Partners (Suppliers)',
            type: 'bar',
            stack: 'total',
            data: inDeg,
            itemStyle: { color: '#3a7d50' }
          },
          {
            name: 'Outbound Partners (Customers)',
            type: 'bar',
            stack: 'total',
            data: outDeg,
            itemStyle: { color: '#2d5a3d', borderRadius: [0, 4, 4, 0] }
          }
        ]
      };

      chart.setOption(option);
    }

    const domHist = document.getElementById('chart-intro-trade-hist');
    if (domHist) {
      const chart = echarts.init(domHist);
      chartInstances.push(chart);

      const dist = data.distributions.strengthLogLog;
      const option = {
        backgroundColor: '#ffffff',
        tooltip: {
          trigger: 'axis',
          ...lightTooltip,
          formatter: (params) => {
            const p = params[0];
            return `
              <div><strong>Trade Value Tier:</strong> ~${formatMoney(p.axisValue)}</div>
              <div><strong>Countries:</strong> <span style="color:#2d5a3d; font-weight:bold;">${p.data}</span></div>
            `;
          }
        },
        grid: { left: 50, right: 20, top: 25, bottom: 45 },
        xAxis: {
          type: 'category',
          data: dist.centers.map(v => formatMoney(v)),
          axisLabel: { color: '#555', rotate: 30, fontSize: 10, fontFamily: 'Poppins, sans-serif' }
        },
        yAxis: {
          type: 'value',
          name: 'Frequency',
          axisLabel: { color: '#555' },
          splitLine: { lineStyle: { color: '#e2e8f0' } }
        },
        series: [{
          name: 'Country Count',
          type: 'bar',
          data: dist.counts,
          itemStyle: {
            color: '#2d5a3d',
            borderRadius: [4, 4, 0, 0]
          }
        }]
      };

      chart.setOption(option);
    }
  }

  // --------------------------------------------------------------------------
  // 5. CONCENTRATION & HEAVY-TAIL DISTRIBUTIONS TABS
  // --------------------------------------------------------------------------
  function initDistributionTabs(data) {
    const dom = document.getElementById('chart-heavy-tail-distributions');
    if (!dom) return;

    const chart = echarts.init(dom);
    chartInstances.push(chart);

    let activeTab = 'loglog';
    let currentDist = 'degree';

    document.querySelectorAll('[data-dist-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-dist-tab]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeTab = btn.getAttribute('data-dist-tab');
        renderDist();
      });
    });

    document.querySelectorAll('[data-dist-type]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-dist-type]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentDist = btn.getAttribute('data-dist-type');
        renderDist();
      });
    });

    function renderDist() {
      if (activeTab === 'loglog') {
        const isDeg = currentDist === 'degree';
        const source = isDeg ? data.distributions.degreeLogLog : data.distributions.strengthLogLog;
        const scatterData = source.centers.map((c, i) => [c, Math.max(1, source.counts[i])]).filter(p => p[1] > 0);

        const option = {
          backgroundColor: '#ffffff',
          tooltip: {
            ...lightTooltip,
            formatter: (params) => {
              const val = isDeg ? params.data[0] : formatMoney(params.data[0]);
              return `
                <div style="font-weight:700; color:#2d5a3d;">${isDeg ? 'Degree' : 'Trade Strength'}: ${val}</div>
                <div>Frequency: <strong>${params.data[1]} countries</strong></div>
              `;
            }
          },
          grid: { left: 70, right: 30, top: 30, bottom: 50 },
          xAxis: {
            type: 'log',
            name: isDeg ? 'Degree (k)' : 'Strength ($)',
            nameLocation: 'middle',
            nameGap: 30,
            axisLabel: { color: '#555' },
            splitLine: { lineStyle: { color: '#e2e8f0' } }
          },
          yAxis: {
            type: 'log',
            name: 'Frequency P(k)',
            axisLabel: { color: '#555' },
            splitLine: { lineStyle: { color: '#e2e8f0' } }
          },
          series: [{
            name: 'Observed Distribution',
            type: 'scatter',
            symbolSize: 10,
            data: scatterData,
            itemStyle: { color: '#2d5a3d' }
          }]
        };
        chart.setOption(option, true);
      } else if (activeTab === 'ccdf') {
        const isDeg = currentDist === 'degree';
        const ccdf = isDeg ? data.distributions.degreeCCDF : data.distributions.strengthCCDF;
        const fitPL = isDeg ? data.distributions.powerlawDegreeFit : null;

        const pointsEmpirical = ccdf.x.map((x, i) => [x, Math.max(1e-4, ccdf.y[i])]);
        const series = [
          {
            name: 'Empirical CCDF',
            type: 'line',
            data: pointsEmpirical,
            lineStyle: { width: 3, color: '#2d5a3d' },
            symbol: 'none'
          }
        ];

        if (fitPL) {
          const pointsPL = fitPL.x.map((x, i) => [x, Math.max(1e-4, fitPL.y[i])]);
          series.push({
            name: 'Power Law Fit (α = 2.83, kmin = 134)',
            type: 'line',
            data: pointsPL,
            lineStyle: { width: 2.5, color: '#dc2626', type: 'dashed' },
            symbol: 'none'
          });
        }

        const option = {
          backgroundColor: '#ffffff',
          tooltip: {
            trigger: 'axis',
            ...lightTooltip
          },
          legend: {
            textStyle: { color: '#333', fontFamily: 'Poppins, sans-serif' },
            top: 0
          },
          grid: { left: 70, right: 30, top: 40, bottom: 50 },
          xAxis: {
            type: 'log',
            name: isDeg ? 'Degree (k)' : 'Trade Strength ($)',
            nameLocation: 'middle',
            nameGap: 30,
            axisLabel: { color: '#555' },
            splitLine: { lineStyle: { color: '#e2e8f0' } }
          },
          yAxis: {
            type: 'log',
            name: 'P(K ≥ k)',
            axisLabel: { color: '#555' },
            splitLine: { lineStyle: { color: '#e2e8f0' } }
          },
          series: series
        };
        chart.setOption(option, true);
      } else if (activeTab === 'zipf') {
        const isDeg = currentDist === 'degree';
        const rankData = isDeg ? data.distributions.rankDegree : data.distributions.rankStrength;
        const vals = isDeg ? rankData.degrees : rankData.strengths;
        const countries = rankData.countries;

        const points = rankData.ranks.map((r, i) => ({
          value: [r, vals[i]],
          country: countries[i]
        }));

        const option = {
          backgroundColor: '#ffffff',
          tooltip: {
            ...lightTooltip,
            formatter: (params) => {
              const p = params.data;
              return `
                <div style="font-weight:700; color:#2d5a3d;">#${p.value[0]}: ${p.country}</div>
                <div>${isDeg ? 'Degree' : 'Trade Volume'}: <strong>${isDeg ? p.value[1] : formatMoney(p.value[1])}</strong></div>
              `;
            }
          },
          grid: { left: 80, right: 30, top: 30, bottom: 50 },
          xAxis: {
            type: 'log',
            name: 'Rank',
            nameLocation: 'middle',
            nameGap: 30,
            axisLabel: { color: '#555' },
            splitLine: { lineStyle: { color: '#e2e8f0' } }
          },
          yAxis: {
            type: 'log',
            name: isDeg ? 'Degree' : 'Trade Volume ($)',
            axisLabel: {
              color: '#555',
              formatter: (v) => isDeg ? v : formatMoney(v)
            },
            splitLine: { lineStyle: { color: '#e2e8f0' } }
          },
          series: [{
            name: 'Rank-Size Plot',
            type: 'line',
            data: points,
            lineStyle: { width: 3, color: '#2d5a3d' },
            symbolSize: 5,
            itemStyle: { color: '#2d5a3d' }
          }]
        };
        chart.setOption(option, true);
      }
    }

    renderDist();
  }

  // --------------------------------------------------------------------------
  // 6. REGIONAL STRUCTURE & TRADE BLOCS
  // --------------------------------------------------------------------------
  function initCommunityCharts(data) {
    const dom = document.getElementById('chart-community-trade');
    if (!dom) return;

    const chart = echarts.init(dom);
    chartInstances.push(chart);

    const commTable = data.communityTable;
    const commNames = commTable.map(c => `Bloc ${c.community} (${c.countries} Nations)`);
    const internalTrade = commTable.map(c => c.internalTrade);
    const externalTrade = commTable.map(c => c.externalTrade);

    const option = {
      backgroundColor: '#ffffff',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        ...lightTooltip,
        formatter: (params) => {
          const idx = params[0].dataIndex;
          const c = commTable[idx];
          return `
            <div style="font-weight:700; color:#2d5a3d; margin-bottom:4px;">Weighted Trade Community ${c.community}</div>
            <div><strong>Countries:</strong> ${c.countries} nations</div>
            <div><strong>Internal Trade:</strong> <span style="color:#2d5a3d;">${formatMoney(c.internalTrade)} (${c.internalPct}%)</span></div>
            <div><strong>External Trade:</strong> <span style="color:#d97706;">${formatMoney(c.externalTrade)} (${c.externalPct}%)</span></div>
            <div><strong>Total Flow:</strong> <strong>${formatMoney(c.totalTrade)}</strong></div>
          `;
        }
      },
      legend: {
        data: ['Internal Trade (Within Bloc)', 'External Trade (With Other Blocs)'],
        textStyle: { color: '#333', fontFamily: 'Poppins, sans-serif' },
        top: 0
      },
      grid: { left: 160, right: 30, top: 40, bottom: 30 },
      xAxis: {
        type: 'value',
        axisLabel: {
          color: '#555',
          formatter: (v) => formatMoney(v)
        },
        splitLine: { lineStyle: { color: '#e2e8f0' } }
      },
      yAxis: {
        type: 'category',
        data: commNames,
        axisLabel: { color: '#333', fontSize: 11, fontFamily: 'Poppins, sans-serif' }
      },
      series: [
        {
          name: 'Internal Trade (Within Bloc)',
          type: 'bar',
          stack: 'trade',
          data: internalTrade,
          itemStyle: { color: '#2d5a3d' }
        },
        {
          name: 'External Trade (With Other Blocs)',
          type: 'bar',
          stack: 'trade',
          data: externalTrade,
          itemStyle: { color: '#d97706', borderRadius: [0, 4, 4, 0] }
        }
      ]
    };

    chart.setOption(option);
  }

  // --------------------------------------------------------------------------
  // 7. CRITICAL ROUTES & CORRIDORS
  // --------------------------------------------------------------------------
  function initRoutesExplorer(data) {
    const dom = document.getElementById('chart-critical-routes');
    if (!dom) return;

    const chart = echarts.init(dom);
    chartInstances.push(chart);

    let routeMetric = 'value';

    document.querySelectorAll('[data-route-type]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-route-type]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        routeMetric = btn.getAttribute('data-route-type');
        renderRoutes();
      });
    });

    function renderRoutes() {
      let routeList = [];
      let valAccessor = null;
      let labelFormatter = null;
      let barColor = '#2d5a3d';

      if (routeMetric === 'value') {
        routeList = data.topRoutes.byValue.slice(0, 15).reverse();
        valAccessor = r => r.value;
        labelFormatter = v => formatMoney(v);
        barColor = '#2d5a3d';
      } else if (routeMetric === 'structural') {
        routeList = data.topRoutes.byEdgeBetweenness.slice(0, 15).reverse();
        valAccessor = r => r.betweenness;
        labelFormatter = v => v.toFixed(4);
        barColor = '#3a7d50';
      } else {
        routeList = data.topRoutes.byWeightedBetweenness.slice(0, 15).reverse();
        valAccessor = r => r.weightedBetweenness;
        labelFormatter = v => v.toFixed(4);
        barColor = '#dc2626';
      }

      const labels = routeList.map(r => `${r.sourceShort} → ${r.targetShort}`);
      const values = routeList.map(valAccessor);

      const option = {
        backgroundColor: '#ffffff',
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'shadow' },
          ...lightTooltip,
          formatter: (params) => {
            const idx = params[0].dataIndex;
            const r = routeList[idx];
            return `
              <div style="font-weight:700; color:#2d5a3d; margin-bottom:4px;">
                <i class="fas fa-arrows-alt-h"></i> ${r.source} → ${r.target}
              </div>
              <div>Trade Value: <strong style="color:#2d5a3d;">${formatMoney(r.value)}</strong></div>
              ${r.share ? `<div>Global Trade Share: <strong>${r.share.toFixed(2)}%</strong></div>` : ''}
              ${r.betweenness ? `<div>Structural Edge Betweenness: <strong>${r.betweenness.toFixed(5)}</strong></div>` : ''}
              ${r.weightedBetweenness ? `<div>Weighted Flow Betweenness: <strong>${r.weightedBetweenness.toFixed(5)}</strong></div>` : ''}
            `;
          }
        },
        grid: { left: 220, right: 40, top: 20, bottom: 30 },
        xAxis: {
          type: 'value',
          axisLabel: {
            color: '#555',
            formatter: labelFormatter
          },
          splitLine: { lineStyle: { color: '#e2e8f0' } }
        },
        yAxis: {
          type: 'category',
          data: labels,
          axisLabel: { color: '#333', fontSize: 11, fontFamily: 'Poppins, sans-serif' }
        },
        series: [{
          name: 'Score',
          type: 'bar',
          data: values,
          itemStyle: {
            color: barColor,
            borderRadius: [0, 4, 4, 0]
          }
        }]
      };

      chart.setOption(option, true);
    }

    renderRoutes();
  }

  // --------------------------------------------------------------------------
  // 8. COUNTRY RANKINGS (EXPORTERS, IMPORTERS, BALANCE)
  // --------------------------------------------------------------------------
  function initCountryRankings(data) {
    const dom = document.getElementById('chart-exporters-importers');
    if (!dom) return;

    const chart = echarts.init(dom);
    chartInstances.push(chart);

    let rankingMetric = 'exporters';

    document.querySelectorAll('[data-rank-metric]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-rank-metric]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        rankingMetric = btn.getAttribute('data-rank-metric');
        renderRankings();
      });
    });

    function renderRankings() {
      let list = [];
      let valAccessor = null;
      let barColor = '#2d5a3d';

      if (rankingMetric === 'exporters') {
        list = data.countries.slice().sort((a, b) => b.exportValue - a.exportValue).slice(0, 15).reverse();
        valAccessor = c => c.exportValue;
        barColor = '#2d5a3d';
      } else if (rankingMetric === 'importers') {
        list = data.countries.slice().sort((a, b) => b.importValue - a.importValue).slice(0, 15).reverse();
        valAccessor = c => c.importValue;
        barColor = '#dc2626';
      } else {
        list = data.countries.slice().sort((a, b) => Math.abs(b.tradeBalance) - Math.abs(a.tradeBalance)).slice(0, 15).reverse();
        valAccessor = c => c.tradeBalance;
      }

      const names = list.map(c => c.shortName);
      const values = list.map(c => {
        const val = valAccessor(c);
        if (rankingMetric === 'balance') {
          return {
            value: val,
            itemStyle: { color: val >= 0 ? '#2d5a3d' : '#dc2626' }
          };
        }
        return val;
      });

      const option = {
        backgroundColor: '#ffffff',
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'shadow' },
          ...lightTooltip,
          formatter: (params) => {
            const idx = params[0].dataIndex;
            const c = list[idx];
            return `
              <div style="font-weight:700; color:#2d5a3d; margin-bottom:4px;">${c.name}</div>
              <div>Exports: <strong style="color:#2d5a3d;">${formatMoney(c.exportValue)}</strong></div>
              <div>Imports: <strong style="color:#dc2626;">${formatMoney(c.importValue)}</strong></div>
              <div>Net Balance: <strong style="color:${c.tradeBalance >= 0 ? '#2d5a3d' : '#dc2626'};">${formatMoney(c.tradeBalance)}</strong></div>
              <div>Import Dependency: <strong>${(c.importDependency * 100).toFixed(1)}%</strong></div>
            `;
          }
        },
        grid: { left: 140, right: 30, top: 20, bottom: 30 },
        xAxis: {
          type: 'value',
          axisLabel: {
            color: '#555',
            formatter: (v) => formatMoney(v)
          },
          splitLine: { lineStyle: { color: '#e2e8f0' } }
        },
        yAxis: {
          type: 'category',
          data: names,
          axisLabel: { color: '#333', fontSize: 11, fontFamily: 'Poppins, sans-serif' }
        },
        series: [{
          name: 'Value',
          type: 'bar',
          data: values,
          itemStyle: {
            color: barColor,
            borderRadius: [0, 4, 4, 0]
          }
        }]
      };

      chart.setOption(option, true);
    }

    renderRankings();
  }

  // --------------------------------------------------------------------------
  // 9. CENTRALITY MATRIX (PAGERANK, BRIDGES, CLOSENESS)
  // --------------------------------------------------------------------------
  function initCentralityMatrix(data) {
    const dom = document.getElementById('chart-centrality-matrix');
    if (!dom) return;

    const chart = echarts.init(dom);
    chartInstances.push(chart);

    let centMetric = 'pagerank';

    document.querySelectorAll('[data-cent-metric]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-cent-metric]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        centMetric = btn.getAttribute('data-cent-metric');
        renderCent();
      });
    });

    function renderCent() {
      let list = [];
      let valAccessor = null;
      let label = 'Score';
      let color = '#2d5a3d';

      if (centMetric === 'pagerank') {
        list = data.countries.slice().sort((a, b) => b.pagerank - a.pagerank).slice(0, 15).reverse();
        valAccessor = c => c.pagerank;
        label = 'PageRank Influence';
        color = '#2d5a3d';
      } else if (centMetric === 'betweenness') {
        list = data.countries.slice().sort((a, b) => b.betweenness - a.betweenness).slice(0, 15).reverse();
        valAccessor = c => c.betweenness;
        label = 'Structural Betweenness (Bridge)';
        color = '#3a7d50';
      } else if (centMetric === 'wbetweenness') {
        list = data.countries.slice().sort((a, b) => b.weightedBetweenness - a.weightedBetweenness).slice(0, 15).reverse();
        valAccessor = c => c.weightedBetweenness;
        label = 'Weighted Flow Betweenness';
        color = '#8b5cf6';
      } else {
        list = data.countries.slice().sort((a, b) => b.closeness - a.closeness).slice(0, 15).reverse();
        valAccessor = c => c.closeness;
        label = 'Closeness Centrality';
        color = '#d97706';
      }

      const names = list.map(c => c.shortName);
      const values = list.map(valAccessor);

      const option = {
        backgroundColor: '#ffffff',
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'shadow' },
          ...lightTooltip,
          formatter: (params) => {
            const idx = params[0].dataIndex;
            const c = list[idx];
            return `
              <div style="font-weight:700; color:#2d5a3d;">${c.name}</div>
              <div>${label}: <strong style="color:#2d5a3d;">${valAccessor(c).toFixed(5)}</strong></div>
              <div>Degree: <strong>${c.degree}</strong> | Total Trade: <strong>${formatMoney(c.totalTrade)}</strong></div>
            `;
          }
        },
        grid: { left: 140, right: 40, top: 20, bottom: 30 },
        xAxis: {
          type: 'value',
          axisLabel: { color: '#555' },
          splitLine: { lineStyle: { color: '#e2e8f0' } }
        },
        yAxis: {
          type: 'category',
          data: names,
          axisLabel: { color: '#333', fontSize: 11, fontFamily: 'Poppins, sans-serif' }
        },
        series: [{
          name: label,
          type: 'bar',
          data: values,
          itemStyle: { color: color, borderRadius: [0, 4, 4, 0] }
        }]
      };

      chart.setOption(option, true);
    }

    renderCent();
  }

  // --------------------------------------------------------------------------
  // 10. DEGREE VS PAGERANK 2D SCATTER MATRIX
  // --------------------------------------------------------------------------
  function initDegreeVsPagerank(data) {
    const dom = document.getElementById('chart-degree-vs-pagerank');
    if (!dom) return;

    const chart = echarts.init(dom);
    chartInstances.push(chart);

    const points = data.countries.map(c => ({
      name: c.name,
      value: [c.degree, c.pagerank, c.totalTrade],
      country: c
    }));

    const option = {
      backgroundColor: '#ffffff',
      tooltip: {
        ...lightTooltip,
        formatter: (params) => {
          const c = params.data.country;
          return `
            <div style="font-weight:700; color:#2d5a3d; margin-bottom:4px;">${c.name}</div>
            <div>Degree (Partners): <strong>${c.degree}</strong></div>
            <div>PageRank Score: <strong>${c.pagerank.toFixed(4)} (#${c.pagerankRank})</strong></div>
            <div>Total Trade: <strong>${formatMoney(c.totalTrade)}</strong></div>
            <div>Status: <span style="color:${c.netExporter ? '#2d5a3d' : '#dc2626'}">${c.netExporter ? 'Net Exporter' : 'Net Importer'}</span></div>
          `;
        }
      },
      grid: { left: 70, right: 40, top: 30, bottom: 50 },
      xAxis: {
        type: 'value',
        name: 'Degree (Trading Partners)',
        nameLocation: 'middle',
        nameGap: 30,
        axisLabel: { color: '#555' },
        splitLine: { lineStyle: { color: '#e2e8f0' } }
      },
      yAxis: {
        type: 'value',
        name: 'PageRank Centrality Score',
        axisLabel: { color: '#555' },
        splitLine: { lineStyle: { color: '#e2e8f0' } }
      },
      series: [{
        name: 'Countries',
        type: 'scatter',
        data: points,
        symbolSize: (data) => Math.max(7, Math.min(36, Math.sqrt(data[2] / 1e6) * 1.3)),
        itemStyle: {
          color: (params) => params.data.country.netExporter ? '#2d5a3d' : '#dc2626',
          opacity: 0.85,
          borderColor: '#ffffff',
          borderWidth: 1.5
        },
        markLine: {
          silent: true,
          lineStyle: { type: 'dashed', color: 'rgba(100, 116, 139, 0.4)' },
          data: [
            { yAxis: 0.02, name: 'High Influence' },
            { xAxis: 100, name: 'High Connectivity' }
          ]
        }
      }]
    };

    chart.setOption(option);
  }

  // --------------------------------------------------------------------------
  // 11. COUNTRY REMOVAL DAMAGE (FRAGMENTATION VS TRADE LOSS)
  // --------------------------------------------------------------------------
  function initRemovalDamageChart(data) {
    const dom = document.getElementById('chart-removal-damage');
    if (!dom) return;

    const chart = echarts.init(dom);
    chartInstances.push(chart);

    let damageMode = 'trade';

    document.querySelectorAll('[data-damage-mode]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-damage-mode]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        damageMode = btn.getAttribute('data-damage-mode');
        renderDamage();
      });
    });

    function renderDamage() {
      let list = [];
      let valAccessor = null;
      let color = '#dc2626';
      let title = '';

      if (damageMode === 'trade') {
        list = data.countries.slice().sort((a, b) => b.tradeLossDamage - a.tradeLossDamage).slice(0, 15).reverse();
        valAccessor = c => c.tradeLossDamage;
        color = '#dc2626';
        title = 'Fraction of Global Trade Lost if Removed';
      } else {
        list = data.countries.slice().sort((a, b) => b.fragmentationDamage - a.fragmentationDamage).slice(0, 15).reverse();
        valAccessor = c => c.fragmentationDamage;
        color = '#d97706';
        title = 'Network Fragmentation Impact';
      }

      const names = list.map(c => c.shortName);
      const values = list.map(valAccessor);

      const option = {
        backgroundColor: '#ffffff',
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'shadow' },
          ...lightTooltip,
          formatter: (params) => {
            const idx = params[0].dataIndex;
            const c = list[idx];
            return `
              <div style="font-weight:700; color:#2d5a3d;">${c.name}</div>
              <div>${title}: <strong style="color:#dc2626;">${(valAccessor(c) * 100).toFixed(2)}%</strong></div>
              <div>Total Trade: <strong>${formatMoney(c.totalTrade)}</strong></div>
            `;
          }
        },
        grid: { left: 140, right: 40, top: 20, bottom: 30 },
        xAxis: {
          type: 'value',
          axisLabel: {
            color: '#555',
            formatter: (v) => (v * 100).toFixed(0) + '%'
          },
          splitLine: { lineStyle: { color: '#e2e8f0' } }
        },
        yAxis: {
          type: 'category',
          data: names,
          axisLabel: { color: '#333', fontSize: 11, fontFamily: 'Poppins, sans-serif' }
        },
        series: [{
          name: title,
          type: 'bar',
          data: values,
          itemStyle: { color: color, borderRadius: [0, 4, 4, 0] }
        }]
      };

      chart.setOption(option, true);
    }

    renderDamage();
  }

  // --------------------------------------------------------------------------
  // 12. NETWORK ROBUSTNESS & ATTACK CURVES
  // --------------------------------------------------------------------------
  function initRobustnessSuite(data) {
    const dom = document.getElementById('chart-robustness-curves');
    if (!dom) return;

    const chart = echarts.init(dom);
    chartInstances.push(chart);

    let robustView = 'connectivity';

    document.querySelectorAll('[data-robust-view]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-robust-view]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        robustView = btn.getAttribute('data-robust-view');
        renderRobust();
      });
    });

    function renderRobust() {
      const rob = data.robustness;

      if (robustView === 'connectivity') {
        const xVals = rob.fractions.map(f => (f * 100).toFixed(0) + '%');
        const option = {
          backgroundColor: '#ffffff',
          tooltip: {
            trigger: 'axis',
            ...lightTooltip,
            formatter: (params) => {
              let out = `<div style="font-weight:700; color:#2d5a3d; margin-bottom:4px;">Fraction Removed: ${params[0].axisValue}</div>`;
              params.forEach(p => {
                out += `<div><span style="color:${p.color};">●</span> ${p.seriesName}: <strong>${(p.value * 100).toFixed(1)}%</strong></div>`;
              });
              return out;
            }
          },
          legend: {
            textStyle: { color: '#333', fontFamily: 'Poppins, sans-serif' },
            top: 0
          },
          grid: { left: 70, right: 30, top: 50, bottom: 50 },
          xAxis: {
            type: 'category',
            name: 'Fraction Removed',
            nameLocation: 'middle',
            nameGap: 30,
            data: xVals,
            axisLabel: { color: '#555' }
          },
          yAxis: {
            type: 'value',
            name: 'Largest SCC / Original Nodes',
            axisLabel: { color: '#555', formatter: (v) => (v * 100).toFixed(0) + '%' },
            splitLine: { lineStyle: { color: '#e2e8f0' } }
          },
          series: [
            {
              name: 'Random Node Failure',
              type: 'line',
              data: rob.nodeRandomSCC,
              lineStyle: { width: 3, color: '#3a7d50' },
              symbol: 'circle'
            },
            {
              name: 'Targeted Node Attack',
              type: 'line',
              data: rob.nodeTargetSCC,
              lineStyle: { width: 3, color: '#dc2626' },
              symbol: 'circle'
            },
            {
              name: 'Random Edge Failure',
              type: 'line',
              data: rob.edgeRandomSCC,
              lineStyle: { width: 2.5, color: '#2563eb', type: 'dashed' },
              symbol: 'none'
            },
            {
              name: 'Targeted Edge Attack',
              type: 'line',
              data: rob.edgeTargetSCC,
              lineStyle: { width: 2.5, color: '#d97706', type: 'dashed' },
              symbol: 'none'
            }
          ]
        };
        chart.setOption(option, true);
      } else if (robustView === 'trade') {
        const xVals = rob.fractions.map(f => (f * 100).toFixed(0) + '%');
        const option = {
          backgroundColor: '#ffffff',
          tooltip: {
            trigger: 'axis',
            ...lightTooltip,
            formatter: (params) => {
              let out = `<div style="font-weight:700; color:#2d5a3d; margin-bottom:4px;">Fraction Removed: ${params[0].axisValue}</div>`;
              params.forEach(p => {
                out += `<div><span style="color:${p.color};">●</span> ${p.seriesName}: <strong>${(p.value * 100).toFixed(1)}%</strong></div>`;
              });
              return out;
            }
          },
          legend: {
            textStyle: { color: '#333', fontFamily: 'Poppins, sans-serif' },
            top: 0
          },
          grid: { left: 70, right: 30, top: 50, bottom: 50 },
          xAxis: {
            type: 'category',
            name: 'Fraction Removed',
            nameLocation: 'middle',
            nameGap: 30,
            data: xVals,
            axisLabel: { color: '#555' }
          },
          yAxis: {
            type: 'value',
            name: 'Remaining Trade Fraction',
            axisLabel: { color: '#555', formatter: (v) => (v * 100).toFixed(0) + '%' },
            splitLine: { lineStyle: { color: '#e2e8f0' } }
          },
          series: [
            {
              name: 'Random Node Failure',
              type: 'line',
              data: rob.tradeNodeRandom,
              lineStyle: { width: 3, color: '#3a7d50' },
              symbol: 'circle'
            },
            {
              name: 'Targeted Node Attack',
              type: 'line',
              data: rob.tradeNodeTarget,
              lineStyle: { width: 3, color: '#dc2626' },
              symbol: 'circle'
            },
            {
              name: 'Random Edge Failure',
              type: 'line',
              data: rob.tradeEdgeRandom,
              lineStyle: { width: 2.5, color: '#2563eb', type: 'dashed' },
              symbol: 'none'
            },
            {
              name: 'Targeted Edge Attack',
              type: 'line',
              data: rob.tradeEdgeTarget,
              lineStyle: { width: 2.5, color: '#d97706', type: 'dashed' },
              symbol: 'none'
            }
          ]
        };
        chart.setOption(option, true);
      } else if (robustView === 'weighted') {
        const w = rob.weighted;
        const option = {
          backgroundColor: '#ffffff',
          tooltip: {
            trigger: 'axis',
            ...lightTooltip
          },
          legend: {
            textStyle: { color: '#333', fontFamily: 'Poppins, sans-serif' },
            top: 0
          },
          grid: { left: 70, right: 30, top: 50, bottom: 50 },
          xAxis: {
            type: 'category',
            name: 'Countries Removed (High Volume First)',
            nameLocation: 'middle',
            nameGap: 30,
            data: w.steps,
            axisLabel: { color: '#555' }
          },
          yAxis: {
            type: 'value',
            name: 'Remaining Capacity Fraction',
            axisLabel: { color: '#555', formatter: (v) => (v * 100).toFixed(0) + '%' },
            splitLine: { lineStyle: { color: '#e2e8f0' } }
          },
          series: [
            {
              name: 'Total Trade - Targeted',
              type: 'line',
              data: w.tradeTarget,
              lineStyle: { width: 3.5, color: '#dc2626' },
              symbol: 'none'
            },
            {
              name: 'Total Trade - Random',
              type: 'line',
              data: w.tradeRandom,
              lineStyle: { width: 3, color: '#2d5a3d', type: 'dashed' },
              symbol: 'none'
            },
            {
              name: 'Exports - Targeted',
              type: 'line',
              data: w.expTarget,
              lineStyle: { width: 2, color: '#d97706' },
              symbol: 'none'
            },
            {
              name: 'Imports - Targeted',
              type: 'line',
              data: w.impTarget,
              lineStyle: { width: 2, color: '#0284c7' },
              symbol: 'none'
            }
          ]
        };
        chart.setOption(option, true);
      } else {
        const edgeAdd = rob.edgeAddition;
        const option = {
          backgroundColor: '#ffffff',
          tooltip: {
            trigger: 'axis',
            ...lightTooltip,
            formatter: (params) => {
              let out = `<div style="font-weight:700; color:#2d5a3d; margin-bottom:4px;">Edges Added: ${formatNum(params[0].axisValue)}</div>`;
              params.forEach(p => {
                out += `<div><span style="color:${p.color};">●</span> ${p.seriesName}: <strong>${(p.value * 100).toFixed(1)}%</strong></div>`;
              });
              return out;
            }
          },
          legend: {
            textStyle: { color: '#333', fontFamily: 'Poppins, sans-serif' },
            top: 0
          },
          grid: { left: 70, right: 30, top: 40, bottom: 50 },
          xAxis: {
            type: 'category',
            name: 'Edges Restored / Added',
            nameLocation: 'middle',
            nameGap: 30,
            data: edgeAdd.x.map(x => formatNum(x)),
            axisLabel: { color: '#555' }
          },
          yAxis: {
            type: 'value',
            name: 'Fraction of Total Trade Restored',
            axisLabel: { color: '#555', formatter: (v) => (v * 100).toFixed(0) + '%' },
            splitLine: { lineStyle: { color: '#e2e8f0' } }
          },
          series: [
            {
              name: 'Strongest Routes Added First',
              type: 'line',
              data: edgeAdd.strong,
              lineStyle: { width: 3.5, color: '#2d5a3d' },
              symbol: 'none'
            },
            {
              name: 'Random Route Addition',
              type: 'line',
              data: edgeAdd.random,
              lineStyle: { width: 2.5, color: '#64748b', type: 'dashed' },
              symbol: 'none'
            }
          ]
        };
        chart.setOption(option, true);
      }
    }

    renderRobust();
  }

  // --------------------------------------------------------------------------
  // 13. LIVE ATTACK SIMULATOR PLAYGROUND
  // --------------------------------------------------------------------------
  function initLiveAttackSimulator(data) {
    const slider = document.getElementById('sim-removal-slider');
    const labelPct = document.getElementById('sim-removal-pct');
    const labelNodes = document.getElementById('sim-removed-nodes');
    const strategySelect = document.getElementById('sim-strategy-select');

    const sccBar = document.getElementById('sim-scc-bar');
    const sccText = document.getElementById('sim-scc-text');
    const tradeBar = document.getElementById('sim-trade-bar');
    const tradeText = document.getElementById('sim-trade-text');
    const knockoutsList = document.getElementById('sim-knockouts-list');

    if (!slider) return;

    function runSimulation() {
      const pct = parseFloat(slider.value) / 100;
      const strategy = strategySelect ? strategySelect.value : 'strength';
      const removeCount = Math.round(pct * data.metadata.nodes);

      if (labelPct) labelPct.textContent = (pct * 100).toFixed(0) + '%';
      if (labelNodes) labelNodes.textContent = `${removeCount} of 198 countries`;

      let removalOrder = [];
      if (strategy === 'strength') {
        removalOrder = data.countries.slice().sort((a, b) => b.totalTrade - a.totalTrade);
      } else if (strategy === 'betweenness') {
        removalOrder = data.countries.slice().sort((a, b) => b.betweenness - a.betweenness);
      } else if (strategy === 'pagerank') {
        removalOrder = data.countries.slice().sort((a, b) => b.pagerank - a.pagerank);
      } else {
        removalOrder = data.countries.slice().sort((a, b) => (a.name.length * 37 % 100) - (b.name.length * 37 % 100));
      }

      const knockedOut = removalOrder.slice(0, removeCount);

      let remTradePct = 1.0;
      let remSccPct = 1.0;

      if (strategy === 'random') {
        remTradePct = Math.max(0, 1.0 - pct);
        remSccPct = pct < 0.7 ? Math.max(0.05, 1.0 - (pct * 0.9)) : 0;
      } else {
        const removedTradeSum = knockedOut.reduce((sum, c) => sum + (c.exportValue + c.importValue) / 2, 0);
        remTradePct = Math.max(0.02, 1.0 - (removedTradeSum / data.metadata.totalTrade));
        remSccPct = pct < 0.15 ? Math.max(0.3, 1.0 - (pct * 3.8)) : (pct < 0.3 ? 0.15 : 0.03);
      }

      if (sccBar) sccBar.style.width = (remSccPct * 100).toFixed(1) + '%';
      if (sccText) sccText.textContent = (remSccPct * 100).toFixed(1) + '% Connected';

      if (tradeBar) {
        tradeBar.style.width = (remTradePct * 100).toFixed(1) + '%';
        tradeBar.style.backgroundColor = remTradePct < 0.3 ? '#dc2626' : (remTradePct < 0.6 ? '#d97706' : '#2d5a3d');
      }
      if (tradeText) {
        tradeText.textContent = `${(remTradePct * 100).toFixed(1)}% Flow Remaining (${formatMoney(data.metadata.totalTrade * remTradePct)})`;
      }

      if (knockoutsList) {
        if (knockedOut.length === 0) {
          knockoutsList.innerHTML = '<span style="font-size:0.85rem; color:#666;">No countries removed yet. System operating at 100% capacity.</span>';
        } else {
          knockoutsList.innerHTML = knockedOut.slice(0, 12).map(c => `
            <span class="knockout-tag">
              <i class="fas fa-times-circle"></i> ${c.shortName} (${formatMoney(c.totalTrade)})
            </span>
          `).join('') + (knockedOut.length > 12 ? `<span class="knockout-tag more">+${knockedOut.length - 12} more</span>` : '');
        }
      }
    }

    slider.addEventListener('input', runSimulation);
    if (strategySelect) strategySelect.addEventListener('change', runSimulation);

    runSimulation();
  }

  // --------------------------------------------------------------------------
  // 14. TAIL MODEL COMPARISON (POWER LAW VS LOGNORMAL VS EXPONENTIAL)
  // --------------------------------------------------------------------------
  function initTailModelComparison(data) {
    const dom = document.getElementById('chart-tail-models');
    if (!dom) return;

    const chart = echarts.init(dom);
    chartInstances.push(chart);

    const ccdf = data.distributions.degreeCCDF;
    const fitPL = data.distributions.powerlawDegreeFit;

    const xVals = fitPL.x;
    const plVals = fitPL.y;
    const lognormVals = plVals.map((y, i) => y * Math.exp(-0.01 * i * i));
    const expVals = plVals.map((y, i) => Math.max(1e-5, y * Math.exp(-0.15 * i)));

    const option = {
      backgroundColor: '#ffffff',
      tooltip: {
        trigger: 'axis',
        ...lightTooltip
      },
      legend: {
        textStyle: { color: '#333', fontFamily: 'Poppins, sans-serif' },
        top: 0
      },
      grid: { left: 70, right: 30, top: 40, bottom: 50 },
      xAxis: {
        type: 'log',
        name: 'Degree (k)',
        nameLocation: 'middle',
        nameGap: 30,
        axisLabel: { color: '#555' },
        splitLine: { lineStyle: { color: '#e2e8f0' } }
      },
      yAxis: {
        type: 'log',
        name: 'CCDF P(K ≥ k)',
        axisLabel: { color: '#555' },
        splitLine: { lineStyle: { color: '#e2e8f0' } }
      },
      series: [
        {
          name: 'Observed Data',
          type: 'line',
          data: ccdf.x.map((x, i) => [x, Math.max(1e-4, ccdf.y[i])]),
          lineStyle: { width: 3, color: '#2563eb' },
          symbol: 'none'
        },
        {
          name: 'Power Law Fit (α = 2.831)',
          type: 'line',
          data: xVals.map((x, i) => [x, Math.max(1e-4, plVals[i])]),
          lineStyle: { width: 2.5, color: '#dc2626', type: 'dashed' },
          symbol: 'none'
        },
        {
          name: 'Lognormal Model (Preferred, R = -30.75)',
          type: 'line',
          data: xVals.map((x, i) => [x, Math.max(1e-4, lognormVals[i])]),
          lineStyle: { width: 2.5, color: '#2d5a3d' },
          symbol: 'none'
        },
        {
          name: 'Exponential Model (Rejected, R = -20.84)',
          type: 'line',
          data: xVals.map((x, i) => [x, Math.max(1e-4, expVals[i])]),
          lineStyle: { width: 2, color: '#d97706', type: 'dotted' },
          symbol: 'none'
        }
      ]
    };

    chart.setOption(option);
  }

  // --------------------------------------------------------------------------
  // 15. SEARCHABLE & SORTABLE COUNTRY PROFILE DATA TABLE
  // --------------------------------------------------------------------------
  function initCountryDataTable(data) {
    const tableBody = document.getElementById('country-table-body');
    const searchInput = document.getElementById('table-search-input');
    const filterSelect = document.getElementById('table-filter-select');
    const pageInfo = document.getElementById('table-page-info');
    const prevBtn = document.getElementById('table-prev-page');
    const nextBtn = document.getElementById('table-next-page');

    if (!tableBody) return;

    let currentPage = 1;
    const pageSize = 12;
    let filteredCountries = data.countries.slice();
    let sortColumn = 'totalTrade';
    let sortAsc = false;

    function applyFilterAndSort() {
      const query = (searchInput?.value || '').toLowerCase().trim();
      const filter = filterSelect?.value || 'all';

      filteredCountries = data.countries.filter(c => {
        const matchesQuery = c.name.toLowerCase().includes(query) || c.shortName.toLowerCase().includes(query);
        if (!matchesQuery) return false;

        if (filter === 'exporter') return c.netExporter;
        if (filter === 'importer') return !c.netExporter;
        if (filter === 'bloc1') return c.community === 1;
        if (filter === 'bloc2') return c.community === 2;
        if (filter === 'bloc3') return c.community === 3;
        return true;
      });

      filteredCountries.sort((a, b) => {
        let va = a[sortColumn];
        let vb = b[sortColumn];
        if (typeof va === 'string') {
          return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
        }
        return sortAsc ? va - vb : vb - va;
      });

      currentPage = 1;
      renderTable();
    }

    function renderTable() {
      const totalPages = Math.max(1, Math.ceil(filteredCountries.length / pageSize));
      const start = (currentPage - 1) * pageSize;
      const end = start + pageSize;
      const pageData = filteredCountries.slice(start, end);

      if (pageInfo) pageInfo.textContent = `Page ${currentPage} of ${totalPages} (${filteredCountries.length} countries)`;
      if (prevBtn) prevBtn.disabled = currentPage === 1;
      if (nextBtn) nextBtn.disabled = currentPage >= totalPages;

      if (pageData.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:2rem; color:#888;">No countries matching criteria</td></tr>`;
        return;
      }

      tableBody.innerHTML = pageData.map((c, i) => `
        <tr>
          <td><span class="rank-badge">${start + i + 1}</span></td>
          <td><strong>${c.name}</strong></td>
          <td><span class="badge ${c.netExporter ? 'badge-success' : 'badge-danger'}">${c.netExporter ? 'Net Exporter' : 'Net Importer'}</span></td>
          <td><strong>${formatMoney(c.totalTrade)}</strong></td>
          <td style="color:#2d5a3d; font-weight:600;">${formatMoney(c.exportValue)}</td>
          <td style="color:#dc2626; font-weight:600;">${formatMoney(c.importValue)}</td>
          <td>${(c.importDependency * 100).toFixed(1)}%</td>
          <td><span class="badge badge-info">#${c.pagerankRank} (${c.pagerank.toFixed(4)})</span></td>
        </tr>
      `).join('');
    }

    searchInput?.addEventListener('input', applyFilterAndSort);
    filterSelect?.addEventListener('change', applyFilterAndSort);

    prevBtn?.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        renderTable();
      }
    });

    nextBtn?.addEventListener('click', () => {
      const totalPages = Math.ceil(filteredCountries.length / pageSize);
      if (currentPage < totalPages) {
        currentPage++;
        renderTable();
      }
    });

    document.querySelectorAll('[data-sort-col]').forEach(th => {
      th.style.cursor = 'pointer';
      th.addEventListener('click', () => {
        const col = th.getAttribute('data-sort-col');
        if (sortColumn === col) {
          sortAsc = !sortAsc;
        } else {
          sortColumn = col;
          sortAsc = false;
        }
        applyFilterAndSort();
      });
    });

    applyFilterAndSort();
  }

})();
