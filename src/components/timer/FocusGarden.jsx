import React, { useState } from "react";
import ReactDOM from "react-dom";
import { useTimer } from "../../context/TimerContext";
import { PLANT_STAGES, PLANT_TYPES } from "./PlantData";
import "./FocusGarden.css";

export default function FocusGarden() {
    const {
        water,
        plantStage,
        plantType,
        waterPlant,
        harvestPlant,
        inventory
    } = useTimer();

    const [isGrowing, setIsGrowing] = useState(false);
    const [showInventory, setShowInventory] = useState(false);
    const [hoveredPlant, setHoveredPlant] = useState(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

    const [hoveredRarity, setHoveredRarity] = useState(null);

    const [sortMode, setSortMode] = useState('recent'); // 'recent', 'rarity_high', 'rarity_low', 'type'

    const rarityPower = { sprout: 1, leaf: 2, flower: 3, ancient: 4 };

    // Get Sorted Inventory
    const getSortedInventory = () => {
        const sorted = [...inventory];
        switch (sortMode) {
            case 'rarity_high':
                return sorted.sort((a, b) => {
                    const rB = rarityPower[PLANT_TYPES[b.type]?.rarity?.toLowerCase()] || 0;
                    const rA = rarityPower[PLANT_TYPES[a.type]?.rarity?.toLowerCase()] || 0;
                    return rB - rA;
                });
            case 'rarity_low':
                return sorted.sort((a, b) => {
                    const rB = rarityPower[PLANT_TYPES[b.type]?.rarity?.toLowerCase()] || 0;
                    const rA = rarityPower[PLANT_TYPES[a.type]?.rarity?.toLowerCase()] || 0;
                    return rA - rB;
                });
            case 'type':
                return sorted.sort((a, b) => {
                    const nameA = PLANT_TYPES[a.type]?.name || "";
                    const nameB = PLANT_TYPES[b.type]?.name || "";
                    return nameA.localeCompare(nameB);
                });
            default: // 'recent'
                return sorted;
        }
    };

    const sortedInventory = getSortedInventory();

    const rarityInfo = {
        sprout: "Common plants that grow easily in any garden.",
        leaf: "Uncommon plants that need a bit more care to bloom.",
        flower: "Rare and beautiful species that require focus and effort.",
        ancient: "Legendary treasures that only appear with great luck and time."
    };

    const currentPlantInfo = PLANT_TYPES[plantType] || PLANT_TYPES.tulip;
    const currentStageInfo = PLANT_STAGES[plantStage];

    const handleMouseEnter = (e, item) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setTooltipPos({
            x: rect.left + rect.width / 2,
            y: rect.top - 10
        });
        setHoveredPlant(item);
    };

    const handleWater = () => {
        const success = waterPlant();
        if (success) {
            setIsGrowing(true);
            setTimeout(() => setIsGrowing(false), 600);
        }
    };

    const handleHarvest = () => {
        const success = harvestPlant();
        if (success) {
            alert(`You harvested a ${currentPlantInfo.name}! 🌻`);
        }
    }

    return (
        <div className="focus-garden-container">
            {/* 🏷️ Masking Tape Element */}
            <div className="garden-tape"></div>

            {/* Header */}
            {!showInventory && (
                <div className="garden-header">
                    <span className="garden-title">🌱 Focus Garden</span>
                    <button
                        className="garden-inventory-btn"
                        onClick={() => setShowInventory(true)}
                    >
                        📖 Collection ({inventory.length})
                    </button>
                </div>
            )}

            {showInventory ? (
                <div className="inventory-view">
                    {/* Header Row - Fixed */}
                    <div className="inventory-header-row">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <h4 className="inventory-title">Your Collection</h4>
                            <span className="inventory-count-badge">
                                {inventory.length} Plants
                            </span>
                        </div>
                        <button
                            className="inventory-close-icon-btn"
                            onClick={() => setShowInventory(false)}
                            title="Close"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Sorting Bar */}
                    <div className="garden-sort-bar">
                        <button
                            className={`sort-tab ${sortMode === 'recent' ? 'active' : ''}`}
                            onClick={() => setSortMode('recent')}
                        >
                            Recent
                        </button>
                        <button
                            className={`sort-tab ${sortMode === 'rarity_high' ? 'active' : ''}`}
                            onClick={() => setSortMode('rarity_high')}
                        >
                            High Rarity 💎
                        </button>
                        <button
                            className={`sort-tab ${sortMode === 'rarity_low' ? 'active' : ''}`}
                            onClick={() => setSortMode('rarity_low')}
                        >
                            Low Rarity 🌱
                        </button>
                        <button
                            className={`sort-tab ${sortMode === 'type' ? 'active' : ''}`}
                            onClick={() => setSortMode('type')}
                        >
                            Same Type 🪴
                        </button>
                    </div>

                    {/* Scrollable Content Area */}
                    <div className="inventory-view-content">
                        <div className="garden-stats-container">
                            <div className="garden-stat">
                                <span className="garden-stat-val">{inventory.length}</span>
                                <span className="garden-stat-lab">Plants</span>
                            </div>
                            <div className="garden-stat">
                                <span className="garden-stat-val">
                                    {new Set(inventory.map(i => i.type)).size}/{Object.keys(PLANT_TYPES).length}
                                </span>
                                <span className="garden-stat-lab">Discovery</span>
                            </div>
                        </div>

                        {inventory.length === 0 ? (
                            <div className="inventory-empty">
                                <span style={{ fontSize: "48px" }}>🍃</span>
                                <p>No plants collected yet.<br />Focus to grow your garden!</p>
                            </div>
                        ) : (
                            <div className="inventory-grid sixth-columns">
                                {sortedInventory.map((item, idx) => {
                                    const plantInfo = PLANT_TYPES[item.type];
                                    return (
                                        <div
                                            key={idx}
                                            className={`inventory-item nature-card rarity-${plantInfo?.rarity?.toLowerCase()}`}
                                            onMouseEnter={(e) => handleMouseEnter(e, item)}
                                            onMouseLeave={() => setHoveredPlant(null)}
                                            style={{ "--nature-color": plantInfo?.color || "#e8f5e9" }}
                                        >
                                            <span className="nature-emoji">{plantInfo?.emoji || "❓"}</span>
                                            <div className="nature-leaf-decoration">🍃</div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Rarity Guide - Fixed at Bottom */}
                    <div className="rarity-guide-container">
                        <div className="rarity-guide-title">
                            {hoveredRarity ? (
                                <span className="rarity-guide-desc-text animation-fade-in">
                                    {rarityInfo[hoveredRarity]}
                                </span>
                            ) : (
                                "Chance per Harvest"
                            )}
                        </div>
                        <div className="rarity-guide-items">
                            <div
                                className="rarity-guide-item sprout"
                                onMouseEnter={() => setHoveredRarity('sprout')}
                                onMouseLeave={() => setHoveredRarity(null)}
                            >
                                🌱 Sprout <span>50%</span>
                            </div>
                            <div
                                className="rarity-guide-item leaf"
                                onMouseEnter={() => setHoveredRarity('leaf')}
                                onMouseLeave={() => setHoveredRarity(null)}
                            >
                                🍃 Leaf <span>30%</span>
                            </div>
                            <div
                                className="rarity-guide-item flower"
                                onMouseEnter={() => setHoveredRarity('flower')}
                                onMouseLeave={() => setHoveredRarity(null)}
                            >
                                🌸 Flower <span>15%</span>
                            </div>
                            <div
                                className="rarity-guide-item ancient"
                                onMouseEnter={() => setHoveredRarity('ancient')}
                                onMouseLeave={() => setHoveredRarity(null)}
                            >
                                🌟 Ancient <span>5%</span>
                            </div>
                        </div>
                    </div>

                    {/* Floating Tooltip Placeholder at Body level */}
                    {hoveredPlant && PLANT_TYPES[hoveredPlant.type] && ReactDOM.createPortal(
                        <div
                            className={`nature-tooltip rarity-${PLANT_TYPES[hoveredPlant.type].rarity.toLowerCase()}`}
                            style={{
                                top: tooltipPos.y,
                                left: tooltipPos.x
                            }}
                        >
                            <div className="nature-rarity-badge">
                                {PLANT_TYPES[hoveredPlant.type].rarity}
                            </div>
                            <span className="nature-name">{PLANT_TYPES[hoveredPlant.type].name}</span>
                            <span className="nature-desc">"{PLANT_TYPES[hoveredPlant.type].description}"</span>
                            <div className="nature-tool-footer">
                                <span className="nature-date">Found at: {new Date(hoveredPlant.date).toLocaleDateString()}</span>
                            </div>
                        </div>,
                        document.body
                    )}
                </div>
            ) : (
                <>
                    {/* Main Plant */}
                    <div className="plant-stage">
                        <div className={`plant-emoji ${isGrowing ? "growing" : ""}`}>
                            {plantStage === 3 ? currentPlantInfo.emoji : currentStageInfo.emoji}
                        </div>
                        <div className="plant-label">
                            {plantStage === 3 ? currentPlantInfo.name : currentStageInfo.label}
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="garden-controls">
                        <div className="water-status">
                            💧 Drops: {water}
                        </div>

                        {plantStage < 3 ? (
                            <button
                                className={`action-btn btn-water ${water >= 10 ? 'ready' : ''}`}
                                onClick={handleWater}
                                disabled={water < 10}
                                style={{ "--fill-percent": `${Math.min(water * 10, 100)}%` }}
                            >
                                <span>{water >= 10 ? "💧 Water Plant" : `💧 Gathering... ${water}/10`}</span>
                            </button>
                        ) : (
                            <button
                                className="action-btn btn-harvest"
                                onClick={handleHarvest}
                            >
                                <span>✨</span> Harvest to Collection
                            </button>
                        )}
                        <p style={{ fontSize: "12px", color: "#999", marginTop: "4px" }}>
                            Focus 1 min = 1 💧
                        </p>
                    </div>
                </>
            )}
        </div>
    );
}
