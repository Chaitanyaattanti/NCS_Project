#!/usr/bin/env python3
"""
Export complete interactive dataset for the Global Food Trade Network Dashboard.
Extracts all metrics, distributions, centralities, routes, robustness curves,
and country profiles matching final.ipynb exactly.
"""

import json
import math
import random
import os
import pandas as pd
import numpy as np
import networkx as nx
from networkx.algorithms.community import greedy_modularity_communities

print("Starting data extraction...")

# 1. Load and clean trade data
df = pd.read_csv("aid_network_edges_directed.csv")
df.columns = df.columns.str.strip().str.lower()
df["source"] = df["source"].astype(str).str.strip()
df["receiver"] = df["receiver"].astype(str).str.strip()
df["value"] = pd.to_numeric(df["value"], errors="coerce")
df = df.dropna()
df = df[df["value"] > 0]
df = df[df["source"] != df["receiver"]]
df = df.groupby(["source", "receiver"], as_index=False)["value"].sum()

print(f"Edges: {len(df)}")

# 2. Build directed weighted graph
G = nx.from_pandas_edgelist(
    df,
    source="source",
    target="receiver",
    edge_attr="value",
    create_using=nx.DiGraph()
)

N_NODES = G.number_of_nodes()
N_EDGES = G.number_of_edges()
TOTAL_TRADE = float(df["value"].sum())

print(f"Graph: {N_NODES} nodes, {N_EDGES} edges, Total Trade: ${TOTAL_TRADE:,.0f}")

# 3. Country Name Mapping
name_fix = {
    "United States of America": "United States",
    "Netherlands (Kingdom of the)": "Netherlands",
    "United Kingdom of Great Britain and Northern Ireland": "United Kingdom",
    "China, mainland": "China",
    "China, Hong Kong SAR": "Hong Kong",
    "China, Taiwan Province of": "Taiwan",
    "China, Macao SAR": "Macau",
    "Russian Federation": "Russia",
    "Viet Nam": "Vietnam",
    "Republic of Korea": "South Korea",
    "Democratic People's Republic of Korea": "North Korea",
    "Iran (Islamic Republic of)": "Iran",
    "Bolivia (Plurinational State of)": "Bolivia",
    "Venezuela (Bolivarian Republic of)": "Venezuela",
    "United Republic of Tanzania": "Tanzania",
    "Lao People's Democratic Republic": "Laos",
    "Syrian Arab Republic": "Syria",
    "Czechia": "Czech Republic",
    "Türkiye": "Turkey",
    "Côte d'Ivoire": "Ivory Coast",
    "Republic of Moldova": "Moldova",
    "Brunei Darussalam": "Brunei",
    "Micronesia (Federated States of)": "Micronesia",
    "North Macedonia": "Macedonia",
    "Eswatini": "Swaziland"
}

# 4. Load Coordinates from Cell 52
coords_raw = {
    "Brazil": (-51.9, -14.2),
    "Mexico": (-102.5, 23.6),
    "Canada": (-96.8, 56.1),
    "Netherlands (Kingdom of the)": (5.3, 52.1),
    "United States of America": (-98.6, 39.5),
    "Germany": (10.4, 51.2),
    "Poland": (19.1, 51.9),
    "Thailand": (100.9, 15.9),
    "Belgium": (4.5, 50.5),
    "Australia": (133.8, -25.3),
    "Spain": (-3.7, 40.4),
    "Italy": (12.6, 42.8),
    "France": (2.2, 46.2),
    "Indonesia": (113.9, -0.8),
    "New Zealand": (172.0, -40.9),
    "Ireland": (-8.2, 53.4),
    "China, mainland": (104.2, 35.9),
    "Austria": (14.6, 47.7),
    "Argentina": (-63.6, -38.4),
    "Peru": (-75.0, -9.2),
    "Colombia": (-74.3, 4.6),
    "United Kingdom of Great Britain and Northern Ireland": (-3.4, 55.4),
    "Chile": (-71.5, -35.7),
    "Portugal": (-8.2, 39.4),
    "India": (78.7, 20.6),
    "Denmark": (10.0, 56.3),
    "Czechia": (15.5, 49.8),
    "Viet Nam": (108.3, 14.1),
    "China, Hong Kong SAR": (114.2, 22.4),
    "Malaysia": (109.7, 4.2),
    "Guatemala": (-90.2, 15.8),
    "Singapore": (103.8, 1.4),
    "Paraguay": (-58.4, -23.4),
    "Ukraine": (31.2, 49.0),
    "Côte d'Ivoire": (-5.6, 7.5),
    "Ecuador": (-78.1, -1.8),
    "Türkiye": (35.2, 39.1),
    "Cambodia": (104.9, 12.6),
    "Costa Rica": (-84.1, 9.7),
    "Russian Federation": (99.0, 61.5),
    "Switzerland": (8.2, 46.8),
    "Hungary": (19.5, 47.2),
    "Dominican Republic": (-70.2, 18.7),
    "Egypt": (30.8, 26.8),
    "Sweden": (18.6, 60.1),
    "South Africa": (22.9, -30.6),
    "United Arab Emirates": (54.0, 24.0),
    "Norway": (8.5, 60.5),
    "Philippines": (121.8, 12.9),
    "Saudi Arabia": (45.1, 23.9),
    "Japan": (138.3, 36.2),
    "Republic of Korea": (127.8, 35.9),
    "Greece": (21.8, 39.1),
    "Romania": (25.0, 45.9),
    "Slovakia": (19.7, 48.7),
    "Morocco": (-7.1, 31.8),
    "Pakistan": (69.3, 30.4),
    "Finland": (25.7, 61.9),
    "Lithuania": (23.9, 55.2),
    "Israel": (34.9, 31.0),
    "Bulgaria": (25.5, 42.7),
    "Ghana": (-1.0, 7.9),
    "Kenya": (38.0, -0.0),
    "Uruguay": (-55.8, -32.5),
    "Nigeria": (8.7, 9.1),
    "Honduras": (-86.2, 15.2),
    "Croatia": (15.2, 45.1),
    "Serbia": (21.0, 44.0),
    "Belarus": (28.0, 53.7),
    "Slovenia": (15.0, 46.1),
    "Algeria": (1.7, 28.0),
    "Tunisia": (9.5, 33.9),
    "Oman": (55.9, 21.5),
    "Kuwait": (47.5, 29.3),
    "Panama": (-80.8, 8.5),
    "Latvia": (24.6, 56.9),
    "Estonia": (25.0, 58.6),
    "Jordan": (36.2, 30.6),
    "Kazakhstan": (66.9, 48.0),
    "Sri Lanka": (80.8, 7.9),
    "Bangladesh": (90.4, 23.7),
    "Nicaragua": (-85.2, 12.9),
    "El Salvador": (-88.9, 13.8),
    "Qatar": (51.2, 25.4),
    "Lebanon": (35.9, 33.9),
    "Bahrain": (50.6, 26.0),
    "Azerbaijan": (47.6, 40.1),
    "Uzbekistan": (64.6, 41.4),
    "Georgia": (43.4, 42.3),
    "Armenia": (45.0, 40.1),
    "Cyprus": (33.4, 35.1),
    "Luxembourg": (6.1, 49.8),
    "Iceland": (-19.0, 65.0),
    "Malta": (14.4, 35.9),
    "Mauritius": (57.6, -20.3),
    "Trinidad and Tobago": (-61.2, 10.7),
    "Jamaica": (-77.3, 18.1),
    "Bahamas": (-77.4, 25.0),
    "Barbados": (-59.5, 13.2),
    "Guyana": (-58.9, 4.9),
    "Suriname": (-56.0, 3.9),
    "Belize": (-88.5, 17.2),
    "Fiji": (178.1, -17.7),
    "Papua New Guinea": (143.9, -6.3),
    "Madagascar": (46.9, -18.8),
    "Senegal": (-14.5, 14.5),
    "Cameroon": (12.4, 7.4),
    "Côte d'Ivoire": (-5.5, 7.5),
    "Togo": (0.8, 8.6),
    "Benin": (2.3, 9.3),
    "Burkina Faso": (-1.6, 12.2),
    "Mali": (-4.0, 17.6),
    "Niger": (8.1, 17.6),
    "Guinea": (-9.7, 9.9),
    "Sierra Leone": (-11.8, 8.5),
    "Liberia": (-9.4, 6.4),
    "Mauritania": (-10.9, 21.0),
    "Gambia": (-15.4, 13.4),
    "Guinea-Bissau": (-15.2, 11.8),
    "Cape Verde": (-24.0, 16.0),
    "Ethiopia": (40.5, 9.1),
    "Uganda": (32.3, 1.4),
    "Tanzania": (34.8, -6.4),
    "United Republic of Tanzania": (34.8, -6.4),
    "Rwanda": (29.9, -1.9),
    "Burundi": (29.9, -3.4),
    "Somalia": (46.2, 5.2),
    "Djibouti": (42.6, 11.8),
    "Eritrea": (39.8, 15.2),
    "Sudan": (30.2, 12.9),
    "South Sudan": (31.3, 6.9),
    "Democratic Republic of the Congo": (21.8, -4.0),
    "Congo": (15.8, -0.2),
    "Gabon": (11.6, -0.8),
    "Equatorial Guinea": (10.3, 1.6),
    "Central African Republic": (20.9, 6.6),
    "Chad": (18.7, 15.5),
    "Angola": (17.9, -11.2),
    "Zambia": (27.8, -13.1),
    "Zimbabwe": (29.2, -19.0),
    "Malawi": (34.3, -13.3),
    "Mozambique": (35.5, -18.7),
    "Namibia": (18.5, -22.9),
    "Botswana": (24.7, -22.3),
    "Lesotho": (28.2, -29.6),
    "Eswatini": (31.5, -26.5),
    "Seychelles": (55.5, -4.7),
    "Comoros": (43.3, -11.6),
    "Sao Tome and Principe": (6.6, 0.2),
    "Yemen": (48.5, 15.6),
    "Syrian Arab Republic": (38.9, 34.8),
    "Iraq": (43.7, 33.2),
    "Iran (Islamic Republic of)": (53.7, 32.4),
    "Afghanistan": (67.7, 33.9),
    "Turkmenistan": (59.6, 38.9),
    "Tajikistan": (71.3, 38.9),
    "Kyrgyzstan": (74.8, 41.2),
    "Mongolia": (103.8, 46.9),
    "Nepal": (84.1, 28.4),
    "Bhutan": (90.4, 27.5),
    "Myanmar": (95.9, 21.9),
    "Lao People's Democratic Republic": (102.5, 19.9),
    "Brunei Darussalam": (114.7, 4.5),
    "Timor-Leste": (125.7, -8.9),
    "Maldives": (73.2, 3.2),
    "Bolivia (Plurinational State of)": (-63.6, -16.3),
    "Venezuela (Bolivarian Republic of)": (-66.6, 6.4),
    "Guyana": (-58.9, 4.9),
    "Suriname": (-56.0, 3.9),
    "Cuba": (-77.8, 21.5),
    "Haiti": (-72.3, 19.0),
    "Albania": (20.2, 41.2),
    "Bosnia and Herzegovina": (17.8, 43.9),
    "Montenegro": (19.4, 42.7),
    "North Macedonia": (21.7, 41.6),
    "Republic of Moldova": (28.4, 47.4),
    "China, Macao SAR": (113.5, 22.2),
    "Cook Islands": (-159.8, -21.2),
    "Tuvalu": (179.2, -7.1),
    "Samoa": (-172.1, -13.8),
    "Tonga": (-175.2, -21.2),
    "Vanuatu": (166.9, -15.4),
    "Solomon Islands": (160.2, -9.6),
    "Kiribati": (-157.4, 1.9),
    "Micronesia (Federated States of)": (150.6, 7.4),
    "Marshall Islands": (171.2, 7.1),
    "Palau": (134.6, 7.5),
    "Nauru": (166.9, -0.5),
    "Democratic People's Republic of Korea": (127.5, 40.3),
    "China, Taiwan Province of": (121.0, 23.7),
    "Libya": (17.2, 26.3)
}

# Ensure every node in G has coordinates
coords = {}
for node in G.nodes():
    if node in coords_raw:
        coords[node] = coords_raw[node]
    else:
        # Fallback to name fix or 0,0
        q = name_fix.get(node, node)
        coords[node] = coords_raw.get(q, (0.0, 0.0))

print("Coordinates mapped for all nodes.")

# 5. Network Metrics & Summary
density = float(nx.density(G))
reciprocity = float(nx.reciprocity(G))
assortativity = float(nx.degree_assortativity_coefficient(G))
largest_scc = len(max(nx.strongly_connected_components(G), key=len))

# Copy graph with distance weights for shortest-path centralities
H = G.copy()
for u, v, d in H.edges(data=True):
    w = d.get("value", 1)
    d["distance"] = 1.0 / (w + 1.0)

# Centralities
print("Calculating centralities...")
pagerank = nx.pagerank(G, weight="value")
closeness = nx.closeness_centrality(G)
wclose = nx.closeness_centrality(H, distance="distance")

betweenness = nx.betweenness_centrality(G, k=80, normalized=True, seed=42)
wbet = nx.betweenness_centrality(H, k=80, normalized=True, seed=42, weight="distance")

# Edge Betweenness
print("Calculating edge betweenness...")
edge_betweenness = nx.edge_betweenness_centrality(G, k=80, normalized=True, seed=42)
w_edge = nx.edge_betweenness_centrality(H, k=80, normalized=True, seed=42, weight="distance")

# Undirected for k-core and communities
UG = G.to_undirected()
core_numbers = nx.core_number(UG)
unweighted_comms = list(greedy_modularity_communities(UG))
unweighted_modularity = float(nx.algorithms.community.modularity(UG, unweighted_comms))

unweighted_comm_map = {}
for i, comm in enumerate(unweighted_comms, 1):
    for node in comm:
        unweighted_comm_map[node] = i

# Weighted communities
weighted_comms = list(greedy_modularity_communities(UG, weight="value"))
weighted_comms = sorted(weighted_comms, key=len, reverse=True)
weighted_comm_map = {}
for i, comm in enumerate(weighted_comms, 1):
    for node in comm:
        weighted_comm_map[node] = i

# 6. Country Trade Profile & Removal Damage
print("Calculating country profiles & removal impacts...")
trade_profile = pd.read_csv("outputs/trade_country_profile.csv")
profile_dict = trade_profile.set_index("Country").to_dict(orient="index")

# Removal Damage Test (exact as Cell 37)
impact_scores = {}
trade_impact = {}
base_trade = TOTAL_TRADE
sample_nodes = list(G.nodes())[:100]

for node in sample_nodes:
    T = G.copy()
    T.remove_node(node)
    if T.number_of_nodes() == 0:
        frag = 1.0
    else:
        new_size = len(max(nx.strongly_connected_components(T), key=len))
        frag = 1.0 - (new_size / T.number_of_nodes())
    impact_scores[node] = float(frag)
    new_trade = sum(d.get("value", 1) for _, _, d in T.edges(data=True))
    trade_impact[node] = float((base_trade - new_trade) / base_trade)

# For nodes beyond first 100, provide default or direct flow calculation
for node in G.nodes():
    if node not in impact_scores:
        impact_scores[node] = 0.0
        # Flow loss is sum of in and out edges
        flow = sum(d.get("value", 0) for _, _, d in G.in_edges(node, data=True)) + \
               sum(d.get("value", 0) for _, _, d in G.out_edges(node, data=True))
        trade_impact[node] = float(flow / base_trade)

# 7. Assemble Country Objects
print("Building country objects...")
deg_dict = dict(G.degree())
in_deg_dict = dict(G.in_degree())
out_deg_dict = dict(G.out_degree())
strength_dict = dict(G.degree(weight="value"))

# Rank pagerank
pr_sorted = sorted(pagerank.items(), key=lambda x: x[1], reverse=True)
pr_ranks = {country: r + 1 for r, (country, _) in enumerate(pr_sorted)}

countries_list = []
for node in sorted(G.nodes()):
    prof = profile_dict.get(node, {})
    c_data = {
        "name": node,
        "shortName": name_fix.get(node, node),
        "coords": [coords[node][0], coords[node][1]], # [lon, lat]
        "totalTrade": float(prof.get("Total_Trade", strength_dict.get(node, 0))),
        "exportValue": float(prof.get("Export_Value", 0)),
        "importValue": float(prof.get("Import_Value", 0)),
        "tradeBalance": float(prof.get("Trade_Balance", 0)),
        "netExporter": prof.get("Net_Exporter", "No") == "Yes",
        "importDependency": float(prof.get("Import_Dependency", 0)),
        "exportDependency": float(prof.get("Export_Dependency", 0)),
        "degree": int(deg_dict.get(node, 0)),
        "inDegree": int(in_deg_dict.get(node, 0)),
        "outDegree": int(out_deg_dict.get(node, 0)),
        "pagerank": float(pagerank.get(node, 0)),
        "pagerankRank": int(pr_ranks.get(node, 999)),
        "betweenness": float(betweenness.get(node, 0)),
        "weightedBetweenness": float(wbet.get(node, 0)),
        "closeness": float(closeness.get(node, 0)),
        "weightedCloseness": float(wclose.get(node, 0)),
        "coreNumber": int(core_numbers.get(node, 0)),
        "community": int(weighted_comm_map.get(node, 1)),
        "unweightedCommunity": int(unweighted_comm_map.get(node, 1)),
        "fragmentationDamage": float(impact_scores.get(node, 0)),
        "tradeLossDamage": float(trade_impact.get(node, 0))
    }
    countries_list.append(c_data)

# 8. Routes & Corridors
print("Processing routes and corridors...")
# Top routes by value
top_val_df = df.sort_values(by="value", ascending=False).head(30)
top_routes_val = [
    {
        "source": row["source"],
        "target": row["receiver"],
        "sourceShort": name_fix.get(row["source"], row["source"]),
        "targetShort": name_fix.get(row["receiver"], row["receiver"]),
        "value": float(row["value"]),
        "share": float(row["value"] / TOTAL_TRADE * 100)
    }
    for _, row in top_val_df.iterrows()
]

# Top structural edge betweenness routes
crit_edges_sorted = sorted(edge_betweenness.items(), key=lambda x: x[1], reverse=True)[:25]
crit_routes_struct = [
    {
        "source": u,
        "target": v,
        "sourceShort": name_fix.get(u, u),
        "targetShort": name_fix.get(v, v),
        "betweenness": float(score),
        "value": float(G.get_edge_data(u, v, {}).get("value", 0))
    }
    for (u, v), score in crit_edges_sorted
]

# Top weighted edge betweenness routes
crit_w_sorted = sorted(w_edge.items(), key=lambda x: x[1], reverse=True)[:25]
crit_routes_weighted = [
    {
        "source": u,
        "target": v,
        "sourceShort": name_fix.get(u, u),
        "targetShort": name_fix.get(v, v),
        "weightedBetweenness": float(score),
        "value": float(G.get_edge_data(u, v, {}).get("value", 0))
    }
    for (u, v), score in crit_w_sorted
]

# Top 300 edges for flow visualization
top_300_df = df.sort_values(by="value", ascending=False).head(300)
top_flow_edges = [
    {
        "source": row["source"],
        "target": row["receiver"],
        "value": float(row["value"]),
        "coords": [coords[row["source"]], coords[row["receiver"]]]
    }
    for _, row in top_300_df.iterrows()
    if row["source"] in coords and row["receiver"] in coords
]

# 9. Distributions (Degree, Strength, CCDF, Fits)
print("Computing distributions & tail models...")
degrees = np.array([d for _, d in G.degree() if d > 0])
strengths = np.array([s for _, s in G.degree(weight="value") if s > 0])

# Degree Histogram bins (log-log)
vals_d, bins_d = np.histogram(degrees, bins=np.logspace(np.log10(1), np.log10(max(degrees) + 1), 25))
centers_d = ((bins_d[:-1] + bins_d[1:]) / 2).tolist()
counts_d = vals_d.tolist()

# Strength Histogram bins (log-log)
vals_s, bins_s = np.histogram(strengths, bins=np.logspace(np.log10(min(strengths)), np.log10(max(strengths) + 1), 25))
centers_s = ((bins_s[:-1] + bins_s[1:]) / 2).tolist()
counts_s = vals_s.tolist()

# Empirical CCDF Degree
sorted_deg = np.sort(degrees)
ccdf_d = (1.0 - np.arange(1, len(sorted_deg) + 1) / len(sorted_deg)).tolist()

# Empirical CCDF Strength
sorted_str = np.sort(strengths)
ccdf_s = (1.0 - np.arange(1, len(sorted_str) + 1) / len(sorted_str)).tolist()

# Rank vs Degree
ranked_d = np.sort(degrees)[::-1]
ranks_d = list(range(1, len(ranked_d) + 1))
deg_countries_ranked = [c for c, d in sorted(G.degree(), key=lambda x: x[1], reverse=True)]

# Rank vs Strength
ranked_s = np.sort(strengths)[::-1]
ranks_s = list(range(1, len(ranked_s) + 1))
str_countries_ranked = [c for c, s in sorted(G.degree(weight="value"), key=lambda x: x[1], reverse=True)]

# Fitted curves for degree tail (alpha=2.831, xmin=134)
# P(K >= k) = (k / xmin) ** (-(alpha - 1))
fit_k = np.logspace(np.log10(134), np.log10(max(degrees)), 50)
fit_ccdf_pl = ((fit_k / 134.0) ** (-1.831)).tolist()
# Normalize so it aligns with empirical ccdf at xmin
empirical_at_xmin = float(np.mean(degrees >= 134))
fit_ccdf_pl = [p * empirical_at_xmin for p in fit_ccdf_pl]

# 10. Robustness Curves (Exact code from Cell 40, Cell 55, Cell 58)
print("Running robustness simulations...")
fractions = np.linspace(0.0, 0.95, 20)

node_random_scc = []
node_target_scc = []
edge_random_scc = []
edge_target_scc = []

trade_node_random = []
trade_node_target = []
trade_edge_random = []
trade_edge_target = []

# Reproducible random seed
random.seed(42)

for f in fractions:
    remove_n = int(f * N_NODES)
    
    # Random Node
    T = G.copy()
    nodes = list(T.nodes())
    random.shuffle(nodes)
    T.remove_nodes_from(nodes[:remove_n])
    scc = len(max(nx.strongly_connected_components(T), key=len)) if T.number_of_nodes() > 0 else 0
    t_trade = sum(d.get("value", 1) for _, _, d in T.edges(data=True))
    node_random_scc.append(float(scc / N_NODES))
    trade_node_random.append(float(t_trade / TOTAL_TRADE))
    
    # Targeted Node
    T = G.copy()
    ranked = sorted(T.degree(weight="value"), key=lambda x: x[1], reverse=True)
    remove_nodes = [n for n, _ in ranked[:remove_n]]
    T.remove_nodes_from(remove_nodes)
    scc = len(max(nx.strongly_connected_components(T), key=len)) if T.number_of_nodes() > 0 else 0
    t_trade = sum(d.get("value", 1) for _, _, d in T.edges(data=True))
    node_target_scc.append(float(scc / N_NODES))
    trade_node_target.append(float(t_trade / TOTAL_TRADE))

    # Edge Failures
    remove_e = int(f * N_EDGES)
    
    # Random Edge
    T = G.copy()
    edges = list(T.edges())
    random.shuffle(edges)
    T.remove_edges_from(edges[:remove_e])
    scc = len(max(nx.strongly_connected_components(T), key=len)) if T.number_of_nodes() > 0 else 0
    t_trade = sum(d.get("value", 1) for _, _, d in T.edges(data=True))
    edge_random_scc.append(float(scc / N_NODES))
    trade_edge_random.append(float(t_trade / TOTAL_TRADE))

    # Targeted Edge
    T = G.copy()
    ranked_e = sorted(T.edges(data=True), key=lambda x: x[2].get("value", 1), reverse=True)
    remove_edges = [(u, v) for u, v, _ in ranked_e[:remove_e]]
    T.remove_edges_from(remove_edges)
    scc = len(max(nx.strongly_connected_components(T), key=len)) if T.number_of_nodes() > 0 else 0
    t_trade = sum(d.get("value", 1) for _, _, d in T.edges(data=True))
    edge_target_scc.append(float(scc / N_NODES))
    trade_edge_target.append(float(t_trade / TOTAL_TRADE))

# Weighted Damage Curves (Exports, Imports, Total Trade) - Cell 55
steps_55 = 100
ranked_countries = [n for n, _ in sorted(G.degree(weight="value"), key=lambda x: x[1], reverse=True)]
rand_countries = list(G.nodes())
random.shuffle(rand_countries)

H_tgt = G.copy()
H_rnd = G.copy()

base_exp = float(sum(dict(G.out_degree(weight="value")).values()))
base_imp = float(sum(dict(G.in_degree(weight="value")).values()))

w_exp_tgt = [1.0]
w_exp_rnd = [1.0]
w_imp_tgt = [1.0]
w_imp_rnd = [1.0]
w_trade_tgt = [1.0]
w_trade_rnd = [1.0]

for i in range(min(steps_55, N_NODES)):
    c_tgt = ranked_countries[i]
    c_rnd = rand_countries[i]
    
    if c_tgt in H_tgt:
        H_tgt.remove_node(c_tgt)
    if c_rnd in H_rnd:
        H_rnd.remove_node(c_rnd)
        
    w_exp_tgt.append(float(sum(dict(H_tgt.out_degree(weight="value")).values()) / base_exp))
    w_exp_rnd.append(float(sum(dict(H_rnd.out_degree(weight="value")).values()) / base_exp))
    w_imp_tgt.append(float(sum(dict(H_tgt.in_degree(weight="value")).values()) / base_imp))
    w_imp_rnd.append(float(sum(dict(H_rnd.in_degree(weight="value")).values()) / base_imp))
    w_trade_tgt.append(float(sum(d.get("value", 1) for _, _, d in H_tgt.edges(data=True)) / TOTAL_TRADE))
    w_trade_rnd.append(float(sum(d.get("value", 1) for _, _, d in H_rnd.edges(data=True)) / TOTAL_TRADE))

# Edge Addition Recovery (Cell 58 / 59)
real_edges = list(G.edges(data=True))
rand_edges = real_edges.copy()
random.shuffle(rand_edges)
strong_edges = sorted(real_edges, key=lambda x: x[2].get("value", 1), reverse=True)

edge_steps = 50
batch_size = len(real_edges) // edge_steps

recovery_x = []
recovery_trade_strong = []
recovery_trade_random = []

H_str = nx.DiGraph()
H_str.add_nodes_from(G.nodes())
H_rnd = nx.DiGraph()
H_rnd.add_nodes_from(G.nodes())

for i in range(edge_steps):
    start = i * batch_size
    end = min((i + 1) * batch_size, len(real_edges))
    
    for u, v, d in strong_edges[start:end]:
        H_str.add_edge(u, v, value=d.get("value", 1))
    for u, v, d in rand_edges[start:end]:
        H_rnd.add_edge(u, v, value=d.get("value", 1))
        
    recovery_x.append(H_str.number_of_edges())
    recovery_trade_strong.append(float(sum(d.get("value", 1) for _, _, d in H_str.edges(data=True)) / TOTAL_TRADE))
    recovery_trade_random.append(float(sum(d.get("value", 1) for _, _, d in H_rnd.edges(data=True)) / TOTAL_TRADE))

# 11. Top Adjacency Sub-matrix (Top 25 hubs)
top_25_hubs = [c for c, _ in sorted(G.degree(weight="value"), key=lambda x: x[1], reverse=True)[:25]]
adj_matrix = []
max_sub_val = 1.0
for r_c in top_25_hubs:
    row_vals = []
    for c_c in top_25_hubs:
        val = float(G.get_edge_data(r_c, c_c, {}).get("value", 0))
        if val > max_sub_val:
            max_sub_val = val
        row_vals.append(val)
    adj_matrix.append(row_vals)

# Normalize
norm_adj = [[round(v / max_sub_val, 4) for v in row] for row in adj_matrix]

# 12. Community Table
community_table = [
    {
        "community": 1,
        "countries": 103,
        "internalTrade": 471440963.0,
        "externalTrade": 428621430.0,
        "totalTrade": 900062393.0,
        "internalPct": 52.38,
        "externalPct": 47.62
    },
    {
        "community": 2,
        "countries": 60,
        "internalTrade": 664122232.0,
        "externalTrade": 322191007.0,
        "totalTrade": 986313239.0,
        "internalPct": 67.33,
        "externalPct": 32.67
    },
    {
        "community": 3,
        "countries": 35,
        "internalTrade": 267405093.0,
        "externalTrade": 307646429.0,
        "totalTrade": 575051522.0,
        "internalPct": 46.50,
        "externalPct": 53.50
    }
]

# 13. Bundle Everything
payload = {
    "metadata": {
        "nodes": N_NODES,
        "edges": N_EDGES,
        "totalTrade": TOTAL_TRADE,
        "density": round(density, 4),
        "reciprocity": round(reciprocity, 4),
        "assortativity": round(assortativity, 4),
        "largestSCC": largest_scc,
        "modularity": round(unweighted_modularity, 4),
        "alphaDegree": 2.831,
        "kminDegree": 134.0,
        "alphaStrength": 2.041,
        "xminStrength": 38730182.0
    },
    "countries": countries_list,
    "topRoutes": {
        "byValue": top_routes_val,
        "byEdgeBetweenness": crit_routes_struct,
        "byWeightedBetweenness": crit_routes_weighted,
        "flow300": top_flow_edges
    },
    "distributions": {
        "degreeLogLog": {
            "centers": [round(c, 2) for c in centers_d],
            "counts": counts_d
        },
        "strengthLogLog": {
            "centers": [round(c, 2) for c in centers_s],
            "counts": counts_s
        },
        "degreeCCDF": {
            "x": [int(k) for k in sorted_deg.tolist()],
            "y": [round(p, 5) for p in ccdf_d]
        },
        "strengthCCDF": {
            "x": [round(s, 1) for s in sorted_str.tolist()],
            "y": [round(p, 5) for p in ccdf_s]
        },
        "powerlawDegreeFit": {
            "x": [round(k, 1) for k in fit_k.tolist()],
            "y": [round(p, 5) for p in fit_ccdf_pl]
        },
        "rankDegree": {
            "ranks": ranks_d,
            "degrees": [int(d) for d in ranked_d.tolist()],
            "countries": deg_countries_ranked
        },
        "rankStrength": {
            "ranks": ranks_s,
            "strengths": [round(s, 1) for s in ranked_s.tolist()],
            "countries": str_countries_ranked
        }
    },
    "robustness": {
        "fractions": [round(f, 3) for f in fractions.tolist()],
        "nodeRandomSCC": [round(v, 4) for v in node_random_scc],
        "nodeTargetSCC": [round(v, 4) for v in node_target_scc],
        "edgeRandomSCC": [round(v, 4) for v in edge_random_scc],
        "edgeTargetSCC": [round(v, 4) for v in edge_target_scc],
        "tradeNodeRandom": [round(v, 4) for v in trade_node_random],
        "tradeNodeTarget": [round(v, 4) for v in trade_node_target],
        "tradeEdgeRandom": [round(v, 4) for v in trade_edge_random],
        "tradeEdgeTarget": [round(v, 4) for v in trade_edge_target],
        "weighted": {
            "steps": list(range(len(w_exp_tgt))),
            "expTarget": [round(v, 4) for v in w_exp_tgt],
            "expRandom": [round(v, 4) for v in w_exp_rnd],
            "impTarget": [round(v, 4) for v in w_imp_tgt],
            "impRandom": [round(v, 4) for v in w_imp_rnd],
            "tradeTarget": [round(v, 4) for v in w_trade_tgt],
            "tradeRandom": [round(v, 4) for v in w_trade_rnd]
        },
        "edgeAddition": {
            "x": recovery_x,
            "strong": [round(v, 4) for v in recovery_trade_strong],
            "random": [round(v, 4) for v in recovery_trade_random]
        }
    },
    "communityTable": community_table,
    "adjacency": {
        "countries": [name_fix.get(c, c) for c in top_25_hubs],
        "matrix": norm_adj
    }
}

# Save as JS file (window.TRADE_DATA) and JSON
js_content = f"window.TRADE_DATA = {json.dumps(payload, indent=2)};\n"
with open("dashboard/trade_data.js", "w") as f:
    f.write(js_content)

with open("dashboard/trade_data.json", "w") as f:
    json.dump(payload, f, indent=2)

print(f"Data export completed successfully!")
print(f"Written: dashboard/trade_data.js ({os.path.getsize('dashboard/trade_data.js')} bytes)")
print(f"Written: dashboard/trade_data.json ({os.path.getsize('dashboard/trade_data.json')} bytes)")
