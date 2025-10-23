"""
Test script for IBD generation quality comparison.
Tests the new chain prompting approach vs old nested approach.
"""

import sys
import os

# Load environment variables from .env file
from dotenv import load_dotenv
env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '.env')
load_dotenv(env_path)

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.AI.diagram_generation import generate_ibd_diagram
import json
from typing import Dict, List

# Test case 1: Battery Pack (Automotive Domain)
BATTERY_TEST = {
    "block_id": "battery-pack",
    "block_name": "Battery Pack",
    "block_description": "High-voltage lithium-ion battery system for electric vehicle powertrain with integrated thermal management and battery management system",
    "block_type": "block",
    "system_context": "Tesla Model S electric vehicle powertrain system",
    "parent_relationships": [
        {"source": "battery-pack", "target": "motor-controller", "label": "400V DC Power Supply"},
        {"source": "charging-port", "target": "battery-pack", "label": "DC Fast Charging"},
        {"source": "battery-pack", "target": "cooling-system", "label": "Thermal Interface"}
    ]
}

# Test case 2: Flight Controller (Aerospace Domain)
FLIGHT_CONTROLLER_TEST = {
    "block_id": "flight-controller",
    "block_name": "Flight Controller",
    "block_description": "Advanced autopilot system with sensor fusion, navigation, and flight control algorithms for autonomous drone operations",
    "block_type": "processor",
    "system_context": "Commercial delivery drone autonomous navigation system",
    "parent_relationships": [
        {"source": "gps-sensor", "target": "flight-controller", "label": "Position Data"},
        {"source": "imu-sensor", "target": "flight-controller", "label": "Orientation Data"},
        {"source": "flight-controller", "target": "motor-esc", "label": "PWM Control Signals"}
    ]
}

# Test case 3: Server (IT Domain)
SERVER_TEST = {
    "block_id": "application-server",
    "block_name": "Application Server",
    "block_description": "High-performance application server with load balancing, caching, and database connection pooling for enterprise web applications",
    "block_type": "processor",
    "system_context": "Cloud-based microservices architecture for e-commerce platform",
    "parent_relationships": [
        {"source": "load-balancer", "target": "application-server", "label": "HTTP Requests"},
        {"source": "application-server", "target": "database-cluster", "label": "SQL Queries"},
        {"source": "application-server", "target": "cache-layer", "label": "Cache Operations"}
    ]
}

def analyze_ibd_quality(result: Dict, test_name: str) -> Dict:
    """Analyze IBD generation quality metrics."""

    if "error" in result:
        return {
            "test_name": test_name,
            "success": False,
            "error": result["error"],
            "quality_score": 0
        }

    ibd_data = result.get("ibd_raw", {})
    nodes = ibd_data.get("nodes", [])
    edges = ibd_data.get("edges", [])

    # Quality metrics
    metrics = {
        "test_name": test_name,
        "success": True,
        "component_count": len(nodes),
        "connection_count": len(edges),
        "has_descriptions": sum(1 for n in nodes if n.get("description")),
        "has_properties": sum(1 for n in nodes if n.get("properties")),
        "labeled_edges": sum(1 for e in edges if e.get("label")),
        "avg_description_length": sum(len(n.get("description", "")) for n in nodes) / max(len(nodes), 1),
        "model_used": result.get("model_used", "unknown"),
    }

    # Calculate quality score (0-100)
    score = 0

    # Components (3-7 ideal): 30 points max
    if 3 <= metrics["component_count"] <= 7:
        score += 30
    elif metrics["component_count"] >= 2:
        score += 20

    # Connections (at least 2): 20 points max
    if metrics["connection_count"] >= 2:
        score += 20
    elif metrics["connection_count"] >= 1:
        score += 10

    # Descriptions: 20 points max
    desc_ratio = metrics["has_descriptions"] / max(metrics["component_count"], 1)
    score += int(desc_ratio * 20)

    # Properties: 15 points max
    props_ratio = metrics["has_properties"] / max(metrics["component_count"], 1)
    score += int(props_ratio * 15)

    # Labeled edges: 15 points max
    label_ratio = metrics["labeled_edges"] / max(metrics["connection_count"], 1)
    score += int(label_ratio * 15)

    metrics["quality_score"] = score
    metrics["quality_grade"] = "Excellent" if score >= 90 else "Good" if score >= 70 else "Fair" if score >= 50 else "Poor"

    return metrics

def run_test_case(test_data: Dict, test_name: str):
    """Run a single test case and analyze results."""

    print(f"\n{'='*80}")
    print(f"Testing: {test_name}")
    print(f"Block: {test_data['block_name']}")
    print(f"Context: {test_data['system_context']}")
    print(f"{'='*80}\n")

    # Generate IBD
    result = generate_ibd_diagram(
        block_id=test_data["block_id"],
        block_name=test_data["block_name"],
        block_description=test_data["block_description"],
        block_type=test_data["block_type"],
        system_context=test_data["system_context"],
        parent_relationships=test_data["parent_relationships"],
        one_shot_examples=None  # No RAG for clean test
    )

    # Analyze quality
    metrics = analyze_ibd_quality(result, test_name)

    # Print results
    if metrics["success"]:
        print(f"✓ Generation successful!")
        print(f"\nQuality Metrics:")
        print(f"  - Quality Score: {metrics['quality_score']}/100 ({metrics['quality_grade']})")
        print(f"  - Components: {metrics['component_count']}")
        print(f"  - Connections: {metrics['connection_count']}")
        print(f"  - With Descriptions: {metrics['has_descriptions']}/{metrics['component_count']}")
        print(f"  - With Properties: {metrics['has_properties']}/{metrics['component_count']}")
        print(f"  - Labeled Edges: {metrics['labeled_edges']}/{metrics['connection_count']}")
        print(f"  - Avg Description Length: {metrics['avg_description_length']:.0f} chars")
        print(f"  - Model: {metrics['model_used']}")

        # Print generated structure
        ibd_data = result.get("ibd_raw", {})
        print(f"\nGenerated Components:")
        for i, node in enumerate(ibd_data.get("nodes", []), 1):
            print(f"  {i}. {node.get('name', 'Unnamed')}")
            if node.get('description'):
                print(f"     Description: {node.get('description')[:80]}...")
            if node.get('properties'):
                props = node.get('properties')
                print(f"     Properties: {list(props.keys())[:3]}")

        print(f"\nGenerated Connections:")
        for i, edge in enumerate(ibd_data.get("edges", []), 1):
            source = edge.get('source', '?')
            target = edge.get('target', '?')
            label = edge.get('label', 'no label')
            print(f"  {i}. {source} → {target}: {label}")
    else:
        print(f"✗ Generation failed!")
        print(f"Error: {metrics['error']}")

    return metrics

def main():
    """Run all test cases."""

    print("\n" + "="*80)
    print("IBD GENERATION QUALITY TEST - Chain Prompting Approach")
    print("="*80)

    # Check for OpenAI API key
    from app.core.config import settings
    if not settings.OPENAI_API_KEY or settings.OPENAI_API_KEY.startswith("your-"):
        print("\n✗ ERROR: OPENAI_API_KEY not configured in .env file")
        print("Please set your OpenAI API key to run tests.")
        return

    print(f"\nUsing model: {settings.OPENAI_GENERATIVE_MODEL}")
    print(f"API Key configured: ✓")

    # Run all test cases
    test_cases = [
        (BATTERY_TEST, "Battery Pack (Automotive)"),
        (FLIGHT_CONTROLLER_TEST, "Flight Controller (Aerospace)"),
        (SERVER_TEST, "Application Server (IT)")
    ]

    results = []
    for test_data, test_name in test_cases:
        metrics = run_test_case(test_data, test_name)
        results.append(metrics)

    # Summary
    print(f"\n{'='*80}")
    print("SUMMARY")
    print(f"{'='*80}\n")

    successful = [r for r in results if r["success"]]
    avg_score = sum(r["quality_score"] for r in successful) / len(successful) if successful else 0
    avg_components = sum(r["component_count"] for r in successful) / len(successful) if successful else 0
    avg_connections = sum(r["connection_count"] for r in successful) / len(successful) if successful else 0

    print(f"Tests Run: {len(results)}")
    print(f"Successful: {len(successful)}/{len(results)}")
    print(f"\nAverage Quality Score: {avg_score:.1f}/100")
    print(f"Average Components per IBD: {avg_components:.1f}")
    print(f"Average Connections per IBD: {avg_connections:.1f}")

    # Individual scores
    print(f"\nIndividual Results:")
    for r in results:
        if r["success"]:
            print(f"  • {r['test_name']}: {r['quality_score']}/100 ({r['quality_grade']})")
        else:
            print(f"  • {r['test_name']}: FAILED")

    # Target comparison
    print(f"\n{'='*80}")
    print("TARGET COMPARISON")
    print(f"{'='*80}")
    print(f"\nTarget: 90%+ quality (nested approach baseline: 70%)")
    print(f"Achieved: {avg_score:.1f}% {'✓' if avg_score >= 90 else '✗'}")
    print(f"\nTarget: 3-7 components (nested approach: 1-3)")
    print(f"Achieved: {avg_components:.1f} components {'✓' if 3 <= avg_components <= 7 else '✗'}")

    # Save results to JSON
    output_file = "test_results_chain_prompting.json"
    with open(output_file, "w") as f:
        json.dump({
            "summary": {
                "tests_run": len(results),
                "successful": len(successful),
                "average_quality_score": avg_score,
                "average_components": avg_components,
                "average_connections": avg_connections
            },
            "results": results
        }, f, indent=2)

    print(f"\nResults saved to: {output_file}")

if __name__ == "__main__":
    main()
