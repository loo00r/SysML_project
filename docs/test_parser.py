#!/usr/bin/env python3
"""
Test script to verify JIRA tasks parsing without creating actual JIRA issues.
Run this first to make sure everything parses correctly.
"""

import re
from pathlib import Path


def parse_markdown_tasks(md_file_path):
    """Parse JIRA_TASKS_BACKEND.md and extract all tasks"""

    with open(md_file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    tasks = []
    current_sprint = None

    # Regex patterns
    sprint_pattern = r'## Sprint (\d+): (.+?) \(Week (\d+)\)'
    task_pattern = r'### (TASK-\d+): (.+?)\n\*\*Type\*\*: (.+?)\n\*\*Priority\*\*: (.+?)\n\*\*Story Points\*\*: (\d+)'

    # Split by tasks
    task_sections = re.split(r'(?=### TASK-)', content)

    for section in task_sections:
        # Check if this section contains a sprint header
        sprint_match = re.search(sprint_pattern, section)
        if sprint_match:
            current_sprint = {
                'number': sprint_match.group(1),
                'name': sprint_match.group(2),
                'week': sprint_match.group(3)
            }

        # Extract task details
        task_match = re.search(task_pattern, section, re.DOTALL)
        if task_match:
            task_id = task_match.group(1)
            task_title = task_match.group(2)
            task_type = task_match.group(3)
            priority = task_match.group(4)
            story_points = int(task_match.group(5))

            # Extract description
            desc_match = re.search(r'\*\*Description\*\*:\n(.+?)(?=\n\*\*)', section, re.DOTALL)
            description = desc_match.group(1).strip() if desc_match else ""

            # Extract acceptance criteria
            ac_match = re.search(r'\*\*Acceptance Criteria\*\*:\n(.+?)(?=\n\*\*)', section, re.DOTALL)
            acceptance_criteria = ac_match.group(1).strip() if ac_match else ""

            # Extract reference
            ref_match = re.search(r'\*\*Reference\*\*: (.+)', section)
            reference = ref_match.group(1).strip() if ref_match else ""

            # Extract dependencies
            dep_match = re.search(r'\*\*Dependencies\*\*: (.+)', section)
            dependencies = dep_match.group(1).strip() if dep_match else "None"

            tasks.append({
                'id': task_id,
                'title': task_title,
                'type': task_type,
                'priority': priority,
                'story_points': story_points,
                'description': description[:100] + "..." if len(description) > 100 else description,
                'has_acceptance_criteria': bool(acceptance_criteria),
                'has_reference': bool(reference),
                'sprint': current_sprint,
                'dependencies': dependencies
            })

    return tasks


def main():
    """Test parsing without creating JIRA issues"""

    md_file = Path(__file__).parent / "JIRA_TASKS_BACKEND.md"

    if not md_file.exists():
        print(f"❌ File not found: {md_file}")
        return

    print("📖 Parsing JIRA_TASKS_BACKEND.md...\n")
    tasks = parse_markdown_tasks(md_file)

    if not tasks:
        print("❌ No tasks found! Check the markdown format.")
        return

    print(f"✅ Successfully parsed {len(tasks)} tasks\n")
    print("=" * 80)

    # Group by sprint
    sprints = {}
    for task in tasks:
        sprint_num = task['sprint']['number'] if task['sprint'] else '0'
        if sprint_num not in sprints:
            sprints[sprint_num] = []
        sprints[sprint_num].append(task)

    # Print summary
    total_points = 0
    for sprint_num in sorted(sprints.keys()):
        sprint_tasks = sprints[sprint_num]
        sprint_points = sum(t['story_points'] for t in sprint_tasks)
        total_points += sprint_points

        if sprint_num == '0':
            print("\n📦 BACKLOG")
        else:
            sprint_name = sprint_tasks[0]['sprint']['name']
            print(f"\n🏃 SPRINT {sprint_num}: {sprint_name}")

        print(f"   Tasks: {len(sprint_tasks)} | Story Points: {sprint_points}")
        print("-" * 80)

        for task in sprint_tasks:
            # Icons
            type_icon = {
                'Task': '📝',
                'Testing': '🧪',
                'Documentation': '📚'
            }.get(task['type'], '📋')

            priority_icon = {
                'High': '🔴',
                'Medium': '🟡',
                'Low': '🟢'
            }.get(task['priority'], '⚪')

            ac_icon = '✅' if task['has_acceptance_criteria'] else '❌'
            ref_icon = '📖' if task['has_reference'] else '❌'

            print(f"   {type_icon} {task['id']}: {task['title']}")
            print(f"      Priority: {priority_icon} {task['priority']} | "
                  f"Points: {task['story_points']} | "
                  f"AC: {ac_icon} | "
                  f"Ref: {ref_icon}")

            if task['dependencies'] != "None":
                print(f"      Dependencies: {task['dependencies']}")

            print()

    print("=" * 80)
    print(f"\n📊 TOTAL: {len(tasks)} tasks, {total_points} story points")

    # Validation checks
    print("\n🔍 Validation:")
    issues = []

    for task in tasks:
        if not task['has_acceptance_criteria']:
            issues.append(f"⚠️  {task['id']} missing Acceptance Criteria")
        if not task['has_reference']:
            issues.append(f"⚠️  {task['id']} missing Reference")
        if task['story_points'] < 1 or task['story_points'] > 8:
            issues.append(f"⚠️  {task['id']} unusual story points: {task['story_points']}")

    if issues:
        print("   Found issues:")
        for issue in issues[:10]:  # Show first 10
            print(f"   {issue}")
        if len(issues) > 10:
            print(f"   ... and {len(issues) - 10} more")
    else:
        print("   ✅ All tasks look good!")

    print("\n" + "=" * 80)
    print("\n✅ Parsing test complete!")
    print("   If everything looks good, run: python jira_tasks.py")


if __name__ == "__main__":
    main()
