"""Add bdd_blocks table and block references for IBD/SMD

Revision ID: add_bdd_blocks_table
Revises: add_smd_table
Create Date: 2025-10-25 15:10:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_bdd_blocks_table'
down_revision = 'add_smd_table'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'bdd_blocks',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('parent_bdd_diagram_id', sa.Integer(), nullable=False),
        sa.Column('block_id', sa.String(), nullable=False),
        sa.Column('block_name', sa.String(), nullable=False),
        sa.Column('block_description', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['parent_bdd_diagram_id'], ['diagram_embeddings.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('parent_bdd_diagram_id', 'block_id', name='uq_bdd_block_parent_block')
    )
    op.create_index(
        op.f('ix_bdd_blocks_parent_bdd_diagram_id'),
        'bdd_blocks',
        ['parent_bdd_diagram_id'],
        unique=False
    )
    op.create_index(
        op.f('ix_bdd_blocks_block_id'),
        'bdd_blocks',
        ['block_id'],
        unique=False
    )

    op.add_column('internal_block_diagrams', sa.Column('parent_block_ref_id', sa.Integer(), nullable=True))
    op.create_index(
        op.f('ix_internal_block_diagrams_parent_block_ref_id'),
        'internal_block_diagrams',
        ['parent_block_ref_id'],
        unique=False
    )
    op.create_foreign_key(
        'fk_internal_block_diagrams_block_ref',
        'internal_block_diagrams',
        'bdd_blocks',
        ['parent_block_ref_id'],
        ['id']
    )

    op.add_column('state_machine_diagrams', sa.Column('parent_block_ref_id', sa.Integer(), nullable=True))
    op.create_index(
        op.f('ix_state_machine_diagrams_parent_block_ref_id'),
        'state_machine_diagrams',
        ['parent_block_ref_id'],
        unique=False
    )
    op.create_foreign_key(
        'fk_state_machine_diagrams_block_ref',
        'state_machine_diagrams',
        'bdd_blocks',
        ['parent_block_ref_id'],
        ['id']
    )


def downgrade() -> None:
    op.drop_constraint('fk_state_machine_diagrams_block_ref', 'state_machine_diagrams', type_='foreignkey')
    op.drop_index(op.f('ix_state_machine_diagrams_parent_block_ref_id'), table_name='state_machine_diagrams')
    op.drop_column('state_machine_diagrams', 'parent_block_ref_id')

    op.drop_constraint('fk_internal_block_diagrams_block_ref', 'internal_block_diagrams', type_='foreignkey')
    op.drop_index(op.f('ix_internal_block_diagrams_parent_block_ref_id'), table_name='internal_block_diagrams')
    op.drop_column('internal_block_diagrams', 'parent_block_ref_id')

    op.drop_index(op.f('ix_bdd_blocks_block_id'), table_name='bdd_blocks')
    op.drop_index(op.f('ix_bdd_blocks_parent_bdd_diagram_id'), table_name='bdd_blocks')
    op.drop_table('bdd_blocks')
