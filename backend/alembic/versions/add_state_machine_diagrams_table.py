"""Add state_machine_diagrams table for chain prompting SMD support

Revision ID: add_smd_table
Revises: add_ibd_table
Create Date: 2025-10-25 14:25:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_smd_table'
down_revision = 'add_ibd_table'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'state_machine_diagrams',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('parent_bdd_diagram_id', sa.Integer(), nullable=False),
        sa.Column('parent_block_id', sa.String(), nullable=False),
        sa.Column('parent_block_name', sa.String(), nullable=True),
        sa.Column('states', sa.JSON(), nullable=False),
        sa.Column('transitions', sa.JSON(), nullable=False),
        sa.Column('source', sa.String(), nullable=False, server_default=sa.text("'ai'")),
        sa.ForeignKeyConstraint(['parent_bdd_diagram_id'], ['diagram_embeddings.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('parent_bdd_diagram_id', 'parent_block_id', name='uq_smd_parent_block')
    )
    op.create_index(
        op.f('ix_state_machine_diagrams_parent_bdd_diagram_id'),
        'state_machine_diagrams',
        ['parent_bdd_diagram_id'],
        unique=False
    )
    op.create_index(
        op.f('ix_state_machine_diagrams_parent_block_id'),
        'state_machine_diagrams',
        ['parent_block_id'],
        unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f('ix_state_machine_diagrams_parent_block_id'), table_name='state_machine_diagrams')
    op.drop_index(op.f('ix_state_machine_diagrams_parent_bdd_diagram_id'), table_name='state_machine_diagrams')
    op.drop_table('state_machine_diagrams')
