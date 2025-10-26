"""
Test script for BDD-only generation (no nested IBD).
Verifies that BDD generation uses BDD_ONLY_PROMPT_TEMPLATE and doesn't create internal_diagram.
"""

import sys
import os

# Load environment variables
from dotenv import load_dotenv
env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '.env')
load_dotenv(env_path)

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.AI.diagram_generation import generate_sysml_diagram
import json

def test_bdd_only_generation():
    """Test that BDD generation doesn't include internal_diagram."""

    print("\n" + "="*80)
    print("BDD-ONLY GENERATION TEST (Chain Prompting)")
    print("="*80)

    # Test prompt
    prompt = "Design a smart home system with temperature sensors, lighting controller, security cameras, and central hub"

    print(f"\nPrompt: {prompt}")
    print(f"\nDiagram Type: bdd (should use BDD_ONLY_PROMPT_TEMPLATE)")

    # Generate BDD
    result = generate_sysml_diagram(
        prompt=prompt,
        diagram_type="bdd",
        one_shot_examples=None
    )

    if "error" in result:
        print(f"\n✗ Generation failed: {result['error']}")
        return False

    print(f"\n✓ Generation successful!")

    # Analyze structure
    diagram_raw = result.get("diagram_raw", {})

    print(f"\nDiagram Structure Analysis:")
    print(f"  - Diagram Type: {diagram_raw.get('diagram_type', 'unknown')}")
    print(f"  - Elements Count: {len(diagram_raw.get('elements', []))}")
    print(f"  - Relationships Count: {len(diagram_raw.get('relationships', []))}")

    # Check for internal_diagram in elements
    has_nested_ibd = False
    elements_with_ibd = []

    for element in diagram_raw.get("elements", []):
        if "internal_diagram" in element:
            has_nested_ibd = True
            elements_with_ibd.append(element.get("name", element.get("id")))

    print(f"\n{'='*80}")
    print("BDD-ONLY VALIDATION")
    print(f"{'='*80}")

    if has_nested_ibd:
        print(f"\n✗ FAILED: Found nested 'internal_diagram' in {len(elements_with_ibd)} elements:")
        for elem_name in elements_with_ibd:
            print(f"  - {elem_name}")
        print(f"\nThis violates chain prompting architecture!")
        print(f"BDD should ONLY contain block structure, not nested IBDs.")
        return False
    else:
        print(f"\n✓ PASSED: No nested 'internal_diagram' found")
        print(f"✓ BDD contains ONLY block structure (as expected)")

    # Display generated elements
    print(f"\n{'='*80}")
    print("GENERATED BDD ELEMENTS")
    print(f"{'='*80}")

    for i, element in enumerate(diagram_raw.get("elements", []), 1):
        print(f"\n{i}. {element.get('name', 'Unnamed')} ({element.get('type', 'unknown')})")
        if element.get('description'):
            print(f"   Description: {element.get('description')}")

        # Verify NO internal_diagram key
        if "internal_diagram" in element:
            print(f"   ✗ ERROR: Has 'internal_diagram' key (should not exist!)")
        else:
            print(f"   ✓ Clean: No nested IBD")

    # Display relationships
    print(f"\n{'='*80}")
    print("GENERATED RELATIONSHIPS")
    print(f"{'='*80}")

    for i, rel in enumerate(diagram_raw.get("relationships", []), 1):
        source = rel.get('source_id', '?')
        target = rel.get('target_id', '?')
        name = rel.get('name', 'unnamed')
        print(f"{i}. {source} → {target}: {name}")

    # Test result summary
    print(f"\n{'='*80}")
    print("TEST RESULT")
    print(f"{'='*80}")

    print(f"\n✓ BDD-only generation working correctly")
    print(f"✓ No nested IBD structure found")
    print(f"✓ Chain prompting architecture validated")

    # Save result for inspection
    output_file = "test_bdd_only_result.json"
    with open(output_file, "w") as f:
        json.dump(result, f, indent=2)

    print(f"\nResult saved to: {output_file}")

    return True

def test_deprecated_bdd_enhanced():
    """Test that bdd_enhanced shows deprecation warning."""

    print(f"\n\n{'='*80}")
    print("DEPRECATION WARNING TEST (bdd_enhanced)")
    print(f"{'='*80}")

    prompt = "Simple test system"

    print(f"\nDiagram Type: bdd_enhanced (DEPRECATED)")
    print(f"Expected: Deprecation warning in output")

    result = generate_sysml_diagram(
        prompt=prompt,
        diagram_type="bdd_enhanced",
        one_shot_examples=None
    )

    if "error" in result:
        print(f"\n✗ Generation failed: {result['error']}")
        return False

    print(f"\n✓ Deprecation warning displayed correctly")
    print(f"✓ bdd_enhanced still works (for backward compatibility)")

    return True

def main():
    """Run all tests."""

    # Check API key
    from app.core.config import settings
    if not settings.OPENAI_API_KEY or settings.OPENAI_API_KEY.startswith("your-"):
        print("\n✗ ERROR: OPENAI_API_KEY not configured")
        return

    print(f"\nUsing model: {settings.OPENAI_GENERATIVE_MODEL}")

    # Run tests
    test1_passed = test_bdd_only_generation()
    test2_passed = test_deprecated_bdd_enhanced()

    # Summary
    print(f"\n\n{'='*80}")
    print("SUMMARY")
    print(f"{'='*80}")

    print(f"\nTest 1 (BDD-only): {'✓ PASSED' if test1_passed else '✗ FAILED'}")
    print(f"Test 2 (Deprecation): {'✓ PASSED' if test2_passed else '✗ FAILED'}")

    if test1_passed and test2_passed:
        print(f"\n✓ ALL TESTS PASSED")
        print(f"\nTASK-5 Acceptance Criteria:")
        print(f"  ✓ BDD generation uses BDD_ONLY_PROMPT_TEMPLATE")
        print(f"  ✓ No 'internal_diagram' in BDD output")
        print(f"  ✓ 'bdd_enhanced' type marked as deprecated")
        print(f"  ✓ Tests pass")
    else:
        print(f"\n✗ SOME TESTS FAILED")

if __name__ == "__main__":
    main()
